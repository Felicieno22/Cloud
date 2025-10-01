const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { sendEmail } = require('../utils/email');

// Fonction pour générer un code de vérification à 6 chiffres
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fonction pour envoyer l'email de vérification
async function sendVerificationEmail(email, code) {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bienvenue sur Crypto Exchange!</h2>
            <p>Merci de vous être inscrit. Pour activer votre compte, veuillez utiliser le code de vérification suivant :</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; text-align: center; color: #2962ff;">${code}</h1>
            <p>Ce code expirera dans 1 heure.</p>
            <p>Si vous n'avez pas créé de compte sur Crypto Exchange, veuillez ignorer cet email.</p>
        </div>
    `;
    
    await sendEmail(email, 'Vérification de votre compte Crypto Exchange', html);
}

// Route pour afficher la page de vérification d'email
router.get('/verify-email', (req, res) => {
    const email = req.query.email;
    if (!email) {
        req.flash('error', 'Email manquant');
        return res.redirect('/login');
    }
    res.render('verify-email', { email });
});

// Route pour vérifier le code
router.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;

    try {
        // Récupération de l'utilisateur et de son token de vérification
        const result = await pool.query(
            `SELECT u.id, us.email_verification_token, us.email_verification_expiry 
             FROM users u 
             JOIN user_security us ON u.id = us.user_id 
             WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.render('verify-email', { 
                email,
                error: 'Utilisateur non trouvé' 
            });
        }

        const { id, email_verification_token, email_verification_expiry } = result.rows[0];

        // Vérification de l'expiration du code
        if (new Date() > new Date(email_verification_expiry)) {
            return res.render('verify-email', { 
                email,
                error: 'Le code de vérification a expiré. Veuillez en demander un nouveau.' 
            });
        }

        // Vérification du code
        if (code !== email_verification_token) {
            return res.render('verify-email', { 
                email,
                error: 'Code de vérification incorrect' 
            });
        }

        // Mise à jour du statut de vérification
        await pool.query(
            `UPDATE user_security 
             SET is_email_verified = TRUE 
             WHERE user_id = $1`,
            [id]
        );

        res.render('verify-email', { 
            email,
            verified: true 
        });

    } catch (error) {
        console.error('Erreur de vérification:', error);
        res.render('verify-email', { 
            email,
            error: 'Une erreur est survenue lors de la vérification' 
        });
    }
});

// Route pour renvoyer le code de vérification
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        // Génération d'un nouveau code
        const newCode = generateVerificationCode();
        
        // Mise à jour du code dans la base de données
        await pool.query(
            `UPDATE user_security us
             SET email_verification_token = $1,
                 email_verification_expiry = NOW() + INTERVAL '1 hour'
             FROM users u
             WHERE u.id = us.user_id AND u.email = $2`,
            [newCode, email]
        );

        // Envoi du nouveau code par email
        await sendVerificationEmail(email, newCode);

        res.render('verify-email', { 
            email,
            message: 'Un nouveau code de vérification a été envoyé à votre adresse email' 
        });

    } catch (error) {
        console.error('Erreur lors du renvoi du code:', error);
        res.render('verify-email', { 
            email,
            error: 'Une erreur est survenue lors de l\'envoi du nouveau code' 
        });
    }
});

// Route de connexion
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Erreur d\'authentification:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Une erreur est survenue lors de la connexion' 
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: info.message || 'Email ou mot de passe incorrect' 
            });
        }

        req.logIn(user, (err) => {
            if (err) {
                console.error('Erreur de connexion:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Une erreur est survenue lors de la connexion' 
                });
            }

            return res.json({ 
                success: true, 
                redirectTo: '/dashboard' 
            });
        });
    })(req, res, next);
});

// Route d'inscription
router.post('/register', async (req, res) => {
    const { nom, prenom, email, date_naissance, ville, password } = req.body;

    try {
        // Vérification si l'email existe déjà
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cet email est déjà utilisé' 
            });
        }

        // Hashage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Création de l'utilisateur
        const result = await pool.query(
            `INSERT INTO users (nom, prenom, email, date_naissance, ville, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email`,
            [nom, prenom, email, date_naissance, ville, hashedPassword]
        );

        // Initialisation du solde de l'utilisateur
        await pool.query(
            'UPDATE users SET balance = 0 WHERE id = $1',
            [result.rows[0].id]
        );

        // Génération et sauvegarde du code de vérification
        const verificationCode = generateVerificationCode();
        await pool.query(
            `INSERT INTO user_security (user_id, email_verification_token, email_verification_expiry)
             VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
            [result.rows[0].id, verificationCode]
        );

        // Envoi de l'email de vérification
        await sendVerificationEmail(email, verificationCode);

        // Connexion automatique après l'inscription
        req.login(result.rows[0], (err) => {
            if (err) {
                console.error('Erreur de connexion après inscription:', err);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Erreur lors de la connexion automatique' 
                });
            }
            res.json({ 
                success: true, 
                redirectTo: `/verify-email?email=${encodeURIComponent(email)}` 
            });
        });

    } catch (error) {
        console.error('Erreur d\'inscription:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Une erreur est survenue lors de l\'inscription' 
        });
    }
});

// Route de déconnexion
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Erreur lors de la déconnexion:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Une erreur est survenue lors de la déconnexion' 
            });
        }
        res.redirect('/');
    });
});

module.exports = router;
