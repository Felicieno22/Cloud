const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Middleware pour vérifier le token JWT
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token manquant' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token invalide' });
    }
};

// Route de connexion admin
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Vérifier si l'admin existe
        const result = await pool.query(
            'SELECT * FROM admins WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }

        const admin = result.rows[0];

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Identifiants invalides' });
        }

        // Créer le token JWT
        const token = jwt.sign(
            { id: admin.id, username: admin.username, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Envoyer le token
        res.json({
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email
            }
        });
    } catch (error) {
        console.error('Erreur lors de la connexion admin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour obtenir les statistiques
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        // Obtenir le nombre de demandes en attente
        const pendingRequestsResult = await pool.query(
            'SELECT COUNT(*) FROM transactions WHERE status = \'pending\''
        );

        // Obtenir le nombre d'utilisateurs actifs (connectés dans les dernières 24h)
        const activeUsersResult = await pool.query(
            'SELECT COUNT(DISTINCT user_id) FROM sessions WHERE created_at > NOW() - INTERVAL \'24 hours\''
        );

        // Obtenir le volume total des transactions sur 24h
        const volumeResult = await pool.query(
            'SELECT COALESCE(SUM(amount * price), 0) as total FROM transactions WHERE created_at > NOW() - INTERVAL \'24 hours\' AND status = \'completed\''
        );

        res.json({
            pendingRequests: parseInt(pendingRequestsResult.rows[0].count),
            activeUsers: parseInt(activeUsersResult.rows[0].count),
            totalVolume: parseFloat(volumeResult.rows[0].total || 0)
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour obtenir les demandes en attente
router.get('/pending-requests', authenticateAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                t.id,
                w.user_id,
                u.username as user,
                t.type,
                t.amount,
                t.price,
                t.status,
                t.created_at
            FROM transactions t
            JOIN wallets w ON w.id = t.wallet_id
            JOIN users u ON u.id = w.user_id
            WHERE t.status = 'pending'
            ORDER BY t.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des demandes:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Route pour traiter une demande
router.post('/requests/:id/:action', authenticateAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id, action } = req.params;
        
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Action invalide' });
        }

        await client.query('BEGIN');

        // Récupérer les informations de la transaction
        const transactionResult = await client.query(
            'SELECT t.*, w.balance FROM transactions t JOIN wallets w ON w.id = t.wallet_id WHERE t.id = $1',
            [id]
        );

        if (transactionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Transaction non trouvée' });
        }

        const transaction = transactionResult.rows[0];
        const status = action === 'approve' ? 'completed' : 'rejected';

        if (action === 'approve') {
            // Mettre à jour le solde du wallet
            const newBalance = transaction.type === 'deposit'
                ? parseFloat(transaction.balance) + parseFloat(transaction.amount)
                : parseFloat(transaction.balance) - parseFloat(transaction.amount);

            // Vérifier si le solde est suffisant pour un retrait
            if (transaction.type === 'withdraw' && newBalance < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Solde insuffisant pour effectuer le retrait' });
            }

            // Mettre à jour le solde du wallet
            await client.query(
                'UPDATE wallets SET balance = $1 WHERE id = $2',
                [newBalance, transaction.wallet_id]
            );
        }

        // Mettre à jour le statut de la transaction
        await client.query(
            'UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2',
            [status, id]
        );

        await client.query('COMMIT');

        res.json({ 
            message: 'Demande traitée avec succès',
            status: status,
            transactionType: transaction.type
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors du traitement de la demande:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

module.exports = router;
