const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Route d'inscription
router.post('/register', async (req, res) => {
    try {
        console.log('Données reçues:', req.body);
        
        const { username, email, password, nom, prenom, ville, date_naissance, photo } = req.body;
        
        // Vérification des champs requis
        const requiredFields = {
            username: "Nom d'utilisateur",
            email: 'Email',
            password: 'Mot de passe',
            nom: 'Nom',
            prenom: 'Prénom',
            ville: 'Ville',
            date_naissance: 'Date de naissance'
        };

        const missingFields = [];
        for (const [field, label] of Object.entries(requiredFields)) {
            if (!req.body[field]) {
                missingFields.push(label);
            }
        }

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Champs obligatoires manquants : ${missingFields.join(', ')}`,
                missingFields
            });
        }

        // Vérifier si l'utilisateur existe déjà
        const userCheck = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (userCheck.rows.length > 0) {
            const existingUser = userCheck.rows[0];
            const conflictField = existingUser.username === username ? 'username' : 'email';
            return res.status(400).json({
                message: `Ce ${conflictField === 'username' ? "nom d'utilisateur" : 'email'} est déjà utilisé`,
                field: conflictField
            });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insérer le nouvel utilisateur avec la photo
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, nom, prenom, ville, date_naissance, photo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id, username, email, nom, prenom, ville, date_naissance, photo`,
            [username, email, hashedPassword, nom, prenom, ville, date_naissance, photo || null]
        );

        // Ne pas renvoyer la photo complète dans la réponse pour optimiser
        const userData = { ...result.rows[0] };
        if (userData.photo) {
            userData.hasPhoto = true;
            delete userData.photo; // On ne renvoie pas la photo complète
        }

        console.log('Utilisateur créé avec succès:', userData);

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: userData
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({
            message: 'Erreur serveur lors de l\'inscription',
            error: error.message
        });
    }
});

// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Vérifier si l'utilisateur existe
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }

        const user = result.rows[0];

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }

        // Créer le token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Envoyer le token
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route de suppression du compte
router.delete('/users/me', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Le mot de passe est requis' });
        }

        // Vérifier le mot de passe
        const userResult = await client.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!validPassword) {
            return res.status(403).json({ message: 'Mot de passe incorrect' });
        }

        await client.query('BEGIN');

        // Supprimer les données associées (wallets, transactions, etc.)
        await client.query('DELETE FROM wallets WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);

        await client.query('COMMIT');
        res.status(200).json({ message: 'Compte supprimé avec succès' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la suppression du compte:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du compte' });
    } finally {
        client.release();
    }
});

// Route pour mettre à jour la photo de profil
router.post('/update-photo', authenticateToken, async (req, res) => {
    try {
        console.log('Tentative de mise à jour de la photo de profil');
        console.log('Headers reçus:', req.headers);
        console.log('User ID from token:', req.user?.id);
        console.log('Token:', req.headers.authorization);

        const { photo } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            console.log('Utilisateur non authentifié');
            return res.status(401).json({ message: 'Non authentifié' });
        }

        // Vérifier que la photo est bien en base64
        if (!photo || !photo.startsWith('data:image/')) {
            console.log('Format de photo invalide');
            return res.status(400).json({ message: 'Format de photo invalide' });
        }

        // Vérifier la taille (max 5MB)
        const base64Size = (photo.length * 3) / 4 - 
            (photo.endsWith('==') ? 2 : photo.endsWith('=') ? 1 : 0);
        if (base64Size > 5 * 1024 * 1024) {
            console.log('Taille de photo trop grande');
            return res.status(400).json({ message: 'La taille de la photo ne doit pas dépasser 5MB' });
        }

        // Mettre à jour la photo dans la base de données
        const result = await pool.query(
            'UPDATE users SET photo = $1 WHERE id = $2 RETURNING id, username, email, nom, prenom, ville, date_naissance, photo',
            [photo, userId]
        );

        if (result.rows.length === 0) {
            console.log('Utilisateur non trouvé en base de données');
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Ne pas renvoyer la photo complète dans la réponse
        const userData = { ...result.rows[0] };
        if (userData.photo) {
            userData.hasPhoto = true;
            delete userData.photo;
        }

        console.log('Photo mise à jour avec succès');
        res.json({
            message: 'Photo mise à jour avec succès',
            user: userData
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la photo:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la photo' });
    }
});

// Route de connexion admin
router.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Tentative de connexion admin avec:', { email, password: '***' });

        // Vérifier si l'utilisateur existe et a le rôle admin
        const query = `
            SELECT u.*, r.name as role_name 
            FROM users u
            LEFT JOIN users_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.email = $1
        `;
        console.log('Exécution de la requête:', query);
        
        const result = await pool.query(query, [email]);
        console.log('Résultat de la requête:', { 
            userFound: result.rows.length > 0,
            userId: result.rows[0]?.id,
            userEmail: result.rows[0]?.email,
            userRole: result.rows[0]?.role_name
        });

        if (result.rows.length === 0) {
            console.log('Utilisateur non trouvé');
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const user = result.rows[0];
        console.log('Comparaison des mots de passe:', {
            providedPassword: password,
            storedHash: user.password_hash
        });
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log('Résultat de la vérification du mot de passe:', { validPassword });

        if (!validPassword) {
            console.log('Mot de passe invalide');
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Vérifier si l'utilisateur a déjà le rôle admin
        if (user.role_name !== 'admin') {
            // Récupérer l'ID du rôle admin
            const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin']);
            if (roleResult.rows.length === 0) {
                throw new Error('Rôle admin non trouvé');
            }
            
            // Attribuer le rôle admin à l'utilisateur
            await pool.query(
                'INSERT INTO users_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [user.id, roleResult.rows[0].id]
            );
            console.log('Rôle admin attribué à l\'utilisateur:', user.id);
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                isAdmin: true
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        console.log('Token généré avec succès pour l\'utilisateur:', user.id);
        
        res.json({ 
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: true
            }
        });
    } catch (err) {
        console.error('Erreur de connexion admin:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
