const express = require('express');
const router = express.Router();
const pool = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const Wallet = require('../models/Wallet');

// Obtenir le solde du portefeuille
router.get('/balance', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT symbol, balance FROM crypto_wallets WHERE user_id = $1',
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération du solde:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération du solde' });
    }
});

// Dépôt
router.post('/deposit', isAuthenticated, async (req, res) => {
    const { amount, symbol } = req.body;
    
    try {
        // Vérifier si le montant est valide
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Montant invalide' });
        }

        // Mettre à jour le solde
        const result = await pool.query(
            `UPDATE crypto_wallets 
             SET balance = balance + $1 
             WHERE user_id = $2 AND symbol = $3 
             RETURNING balance`,
            [amount, req.user.id, symbol]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portefeuille non trouvé' });
        }

        res.json({ 
            success: true, 
            message: 'Dépôt effectué avec succès',
            newBalance: result.rows[0].balance
        });
    } catch (error) {
        console.error('Erreur lors du dépôt:', error);
        res.status(500).json({ error: 'Erreur lors du dépôt' });
    }
});

// Dépôt
router.post('/deposit', isAuthenticated, async (req, res) => {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ error: 'Montant invalide' });
    }

    try {
        const updatedWallet = await Wallet.updateBalance(req.user.id, depositAmount);
        
        // Enregistrer la transaction
        await pool.query(
            'INSERT INTO transactions (user_id, type, amount, status) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'deposit', depositAmount, 'completed']
        );

        res.json({ 
            success: true, 
            balance: updatedWallet.balance,
            message: 'Dépôt effectué avec succès' 
        });
    } catch (error) {
        console.error('Erreur lors du dépôt:', error);
        res.status(500).json({ error: 'Erreur lors du dépôt' });
    }
});

// Retrait
router.post('/withdraw', isAuthenticated, async (req, res) => {
    const { amount, symbol } = req.body;
    
    try {
        // Vérifier si le montant est valide
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Montant invalide' });
        }

        // Vérifier le solde disponible
        const walletResult = await pool.query(
            'SELECT balance FROM crypto_wallets WHERE user_id = $1 AND symbol = $2',
            [req.user.id, symbol]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({ error: 'Portefeuille non trouvé' });
        }

        const currentBalance = walletResult.rows[0].balance;
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Solde insuffisant' });
        }

        // Effectuer le retrait
        const result = await pool.query(
            `UPDATE crypto_wallets 
             SET balance = balance - $1 
             WHERE user_id = $2 AND symbol = $3 
             RETURNING balance`,
            [amount, req.user.id, symbol]
        );

        res.json({ 
            success: true, 
            message: 'Retrait effectué avec succès',
            newBalance: result.rows[0].balance
        });
    } catch (error) {
        console.error('Erreur lors du retrait:', error);
        res.status(500).json({ error: 'Erreur lors du retrait' });
    }
});

// Retrait
router.post('/withdraw', isAuthenticated, async (req, res) => {
    const { amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ error: 'Montant invalide' });
    }

    try {
        const currentBalance = await Wallet.getBalance(req.user.id);
        
        if (currentBalance < withdrawAmount) {
            return res.status(400).json({ error: 'Solde insuffisant' });
        }

        const updatedWallet = await Wallet.updateBalance(req.user.id, -withdrawAmount);
        
        // Enregistrer la transaction
        await pool.query(
            'INSERT INTO transactions (user_id, type, amount, status) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'withdraw', withdrawAmount, 'completed']
        );

        res.json({ 
            success: true, 
            balance: updatedWallet.balance,
            message: 'Retrait effectué avec succès' 
        });
    } catch (error) {
        console.error('Erreur lors du retrait:', error);
        res.status(500).json({ error: 'Erreur lors du retrait' });
    }
});

// Obtenir l'historique des transactions
router.get('/transactions', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM transactions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 10`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des transactions' });
    }
});

module.exports = router;
