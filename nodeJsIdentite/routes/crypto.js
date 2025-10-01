const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');
const { isAuthenticated } = require('../utils/auth');
const pool = require('../db');

// Routes publiques
router.get('/prices', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.symbol,
                c.name,
                c.current_price as price,
                COALESCE(
                    (SELECT 100 * (c.current_price - ph.price) / ph.price
                    FROM price_history ph
                    WHERE ph.symbol = c.symbol
                    AND ph.timestamp >= NOW() - INTERVAL '24 hours'
                    ORDER BY ph.timestamp ASC
                    LIMIT 1), 0
                ) as change_24h,
                c.last_updated
            FROM cryptocurrencies c
            ORDER BY c.symbol ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des prix:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des prix' });
    }
});

router.get('/history/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { period = '24h' } = req.query;

        let timeLimit;
        switch (period) {
            case '1h':
                timeLimit = "interval '1 hour'";
                break;
            case '24h':
                timeLimit = "interval '1 day'";
                break;
            case '7d':
                timeLimit = "interval '7 days'";
                break;
            case '30d':
                timeLimit = "interval '30 days'";
                break;
            default:
                timeLimit = "interval '1 day'";
        }

        const result = await pool.query(
            `SELECT symbol, price, timestamp 
             FROM price_history 
             WHERE symbol = $1 
             AND timestamp > NOW() - ${timeLimit}
             ORDER BY timestamp DESC`,
            [symbol]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
    }
});

// Routes protégées (nécessitent une authentification)
router.use(isAuthenticated);

// Obtenir le portefeuille de l'utilisateur
router.get('/wallet', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM wallets WHERE user_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portefeuille non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur lors de la récupération du portefeuille:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Déposer de l'argent
router.post('/deposit', async (req, res) => {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Montant invalide' });
    }

    try {
        const result = await pool.query(
            `UPDATE wallets 
             SET balance = balance + $1 
             WHERE user_id = $2 
             RETURNING *`,
            [amount, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Portefeuille non trouvé' });
        }

        // Enregistrer la transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, created_at) 
             VALUES ($1, 'deposit', $2, 'completed', CURRENT_TIMESTAMP)`,
            [req.user.id, amount]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur lors du dépôt:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Retirer de l'argent
router.post('/withdraw', async (req, res) => {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Montant invalide' });
    }

    try {
        // Vérifier le solde
        const walletResult = await pool.query(
            'SELECT balance FROM wallets WHERE user_id = $1',
            [req.user.id]
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
            `UPDATE wallets 
             SET balance = balance - $1 
             WHERE user_id = $2 
             RETURNING *`,
            [amount, req.user.id]
        );

        // Enregistrer la transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, created_at) 
             VALUES ($1, 'withdraw', $2, 'completed', CURRENT_TIMESTAMP)`,
            [req.user.id, amount]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur lors du retrait:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir l'historique des transactions
router.get('/transactions', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM transactions 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Opérations sur les cryptomonnaies
router.post('/buy', cryptoController.buyCrypto);
router.post('/sell', cryptoController.sellCrypto);

module.exports = router;