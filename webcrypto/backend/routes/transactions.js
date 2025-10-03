const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const authenticateToken = require('../middleware/auth');

// Route pour créer une demande de dépôt
router.post('/deposit', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Montant invalide' });
        }

        // Vérifier si l'utilisateur a un wallet
        const walletResult = await client.query(
            'SELECT id FROM wallets WHERE user_id = $1',
            [req.user.id]
        );

        let walletId;
        if (walletResult.rows.length === 0) {
            // Créer un nouveau wallet si l'utilisateur n'en a pas
            const newWalletResult = await client.query(
                'INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id',
                [req.user.id]
            );
            walletId = newWalletResult.rows[0].id;
        } else {
            walletId = walletResult.rows[0].id;
        }

        // Commencer la transaction
        await client.query('BEGIN');

        // Créer la transaction en attente
        await client.query(
            `INSERT INTO transactions 
            (wallet_id, type, amount, status, details) 
            VALUES ($1, 'deposit', $2, 'pending', 'Demande de dépôt en attente de validation')`,
            [walletId, amount]
        );

        await client.query('COMMIT');
        res.json({ message: 'Demande de dépôt créée avec succès' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la création de la demande de dépôt:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

// Route pour créer une demande de retrait
router.post('/withdraw', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Montant invalide' });
        }

        // Vérifier si l'utilisateur a un wallet et son solde
        const walletResult = await client.query(
            'SELECT id, balance FROM wallets WHERE user_id = $1',
            [req.user.id]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({ message: 'Wallet non trouvé' });
        }

        const wallet = walletResult.rows[0];

        // Vérifier si le solde est suffisant
        if (parseFloat(wallet.balance) < parseFloat(amount)) {
            return res.status(400).json({ message: 'Solde insuffisant' });
        }

        // Commencer la transaction
        await client.query('BEGIN');

        // Créer la transaction en attente
        await client.query(
            `INSERT INTO transactions 
            (wallet_id, type, amount, status, details) 
            VALUES ($1, 'withdraw', $2, 'pending', 'Demande de retrait en attente de validation')`,
            [wallet.id, amount]
        );

        await client.query('COMMIT');
        res.json({ message: 'Demande de retrait créée avec succès' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la création de la demande de retrait:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        client.release();
    }
});

module.exports = router;
