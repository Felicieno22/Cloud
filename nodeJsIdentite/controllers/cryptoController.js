const pool = require('../db');
const nodemailer = require('nodemailer');
const { generateVerificationCode } = require('../utils/helpers');
require('dotenv').config();

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

const cryptoController = {
    // Obtenir les prix actuels
    getCurrentPrices: async (req, res) => {
        try {
            const result = await pool.query('SELECT * FROM cryptocurrencies ORDER BY symbol');
            res.json(result.rows || []); // Assurer qu'on renvoie au moins un tableau vide
        } catch (error) {
            console.error('Erreur lors de la récupération des prix:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    },

    // Obtenir l'historique des prix
    getPriceHistory: async (req, res) => {
        const { symbol } = req.params;
        const { period = '1h' } = req.query;
        
        try {
            let timeLimit;
            switch(period) {
                case '24h':
                    timeLimit = '24 hours';
                    break;
                case '7d':
                    timeLimit = '7 days';
                    break;
                case '30d':
                    timeLimit = '30 days';
                    break;
                default:
                    timeLimit = '1 hour';
            }

            const result = await pool.query(
                'SELECT * FROM price_history WHERE symbol = $1 AND timestamp > NOW() - $2::interval ORDER BY timestamp',
                [symbol, timeLimit]
            );
            res.json(result.rows || []); // Assurer qu'on renvoie au moins un tableau vide
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    },

    // Obtenir le portefeuille de l'utilisateur
    getWallet: async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT cw.symbol, cw.balance, cw.balance * c.current_price as total_value 
                FROM crypto_wallets cw 
                JOIN cryptocurrencies c ON cw.symbol = c.symbol 
                WHERE cw.user_id = $1`,
                [req.user.id]
            );
            res.json(result.rows || []); // Assurer qu'on renvoie au moins un tableau vide
        } catch (error) {
            console.error('Erreur lors de la récupération du portefeuille:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    },

    // Déposer des fonds
    depositFunds: async (req, res) => {
        const { amount } = req.body;
        const userId = req.user.id;

        try {
            // Vérifier que le montant est valide
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Montant invalide' });
            }

            // Générer un code de vérification
            const verificationCode = generateVerificationCode();
            const expiryTime = new Date();
            expiryTime.setMinutes(expiryTime.getMinutes() + 15); // Code valide 15 minutes

            // Enregistrer l'opération en attente
            const result = await pool.query(
                `INSERT INTO wallet_operations 
                (user_id, operation_type, amount, verification_code, expiry_time, status) 
                VALUES ($1, 'deposit', $2, $3, $4, 'pending') 
                RETURNING id`,
                [userId, amount, verificationCode, expiryTime]
            );

            const operationId = result.rows[0].id;

            // Envoyer l'email de vérification
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: req.user.email,
                subject: 'Code de vérification pour votre dépôt',
                text: `Votre code de vérification pour le dépôt de ${amount}€ est : ${verificationCode}\nCe code expire dans 15 minutes.`
            };

            await transporter.sendMail(mailOptions);

            res.json({ 
                message: 'Code de vérification envoyé',
                operationId
            });
        } catch (error) {
            console.error('Erreur lors du dépôt:', error);
            res.status(500).json({ error: 'Erreur lors du dépôt: ' + error.message });
        }
    },

    // Vérifier un dépôt
    verifyDeposit: async (req, res) => {
        const { operationId, code } = req.body;
        const userId = req.user.id;

        try {
            // Vérifier l'opération
            const operationResult = await pool.query(
                `SELECT * FROM wallet_operations 
                WHERE id = $1 AND user_id = $2 AND operation_type = 'deposit' 
                AND status = 'pending' AND verification_code = $3 
                AND expiry_time > NOW()`,
                [operationId, userId, code]
            );

            if (operationResult.rows.length === 0) {
                return res.status(400).json({ error: 'Code invalide ou expiré' });
            }

            const operation = operationResult.rows[0];

            // Mettre à jour le solde de l'utilisateur
            await pool.query(
                'UPDATE users SET balance = balance + $1 WHERE id = $2',
                [operation.amount, userId]
            );

            // Marquer l'opération comme complétée
            await pool.query(
                'UPDATE wallet_operations SET status = \'completed\', completed_at = NOW() WHERE id = $1',
                [operationId]
            );

            res.json({ message: 'Dépôt effectué avec succès' });
        } catch (error) {
            console.error('Erreur lors de la vérification du dépôt:', error);
            res.status(500).json({ error: 'Erreur lors de la vérification: ' + error.message });
        }
    },

    // Retirer des fonds
    withdrawFunds: async (req, res) => {
        const { amount } = req.body;
        const userId = req.user.id;

        try {
            // Vérifier que le montant est valide
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Montant invalide' });
            }

            // Vérifier le solde disponible
            const userResult = await pool.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows[0].balance < amount) {
                return res.status(400).json({ error: 'Solde insuffisant' });
            }

            // Générer un code de vérification
            const verificationCode = generateVerificationCode();
            const expiryTime = new Date();
            expiryTime.setMinutes(expiryTime.getMinutes() + 15);

            // Enregistrer l'opération en attente
            const result = await pool.query(
                `INSERT INTO wallet_operations 
                (user_id, operation_type, amount, verification_code, expiry_time, status) 
                VALUES ($1, 'withdrawal', $2, $3, $4, 'pending') 
                RETURNING id`,
                [userId, amount, verificationCode, expiryTime]
            );

            const operationId = result.rows[0].id;

            // Envoyer l'email de vérification
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: req.user.email,
                subject: 'Code de vérification pour votre retrait',
                text: `Votre code de vérification pour le retrait de ${amount}€ est : ${verificationCode}\nCe code expire dans 15 minutes.`
            };

            await transporter.sendMail(mailOptions);

            res.json({ 
                message: 'Code de vérification envoyé',
                operationId
            });
        } catch (error) {
            console.error('Erreur lors du retrait:', error);
            res.status(500).json({ error: 'Erreur lors du retrait: ' + error.message });
        }
    },

    // Vérifier un retrait
    verifyWithdrawal: async (req, res) => {
        const { operationId, code } = req.body;
        const userId = req.user.id;

        try {
            // Vérifier l'opération
            const operationResult = await pool.query(
                `SELECT * FROM wallet_operations 
                WHERE id = $1 AND user_id = $2 AND operation_type = 'withdrawal' 
                AND status = 'pending' AND verification_code = $3 
                AND expiry_time > NOW()`,
                [operationId, userId, code]
            );

            if (operationResult.rows.length === 0) {
                return res.status(400).json({ error: 'Code invalide ou expiré' });
            }

            const operation = operationResult.rows[0];

            // Vérifier à nouveau le solde
            const userResult = await pool.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows[0].balance < operation.amount) {
                return res.status(400).json({ error: 'Solde insuffisant' });
            }

            // Mettre à jour le solde de l'utilisateur
            await pool.query(
                'UPDATE users SET balance = balance - $1 WHERE id = $2',
                [operation.amount, userId]
            );

            // Marquer l'opération comme complétée
            await pool.query(
                'UPDATE wallet_operations SET status = \'completed\', completed_at = NOW() WHERE id = $1',
                [operationId]
            );

            res.json({ message: 'Retrait effectué avec succès' });
        } catch (error) {
            console.error('Erreur lors de la vérification du retrait:', error);
            res.status(500).json({ error: 'Erreur lors de la vérification: ' + error.message });
        }
    },

    // Acheter une cryptomonnaie
    buyCrypto: async (req, res) => {
        const { symbol, amount } = req.body;
        const userId = req.user.id;

        try {
            // Obtenir le prix actuel
            const priceResult = await pool.query(
                'SELECT current_price FROM cryptocurrencies WHERE symbol = $1',
                [symbol]
            );

            if (priceResult.rows.length === 0) {
                return res.status(404).json({ error: 'Cryptomonnaie non trouvée' });
            }

            const price = priceResult.rows[0].current_price;
            const totalCost = price * amount;

            // Vérifier le solde
            const userResult = await pool.query(
                'SELECT balance FROM users WHERE id = $1',
                [userId]
            );

            if (userResult.rows[0].balance < totalCost) {
                return res.status(400).json({ error: 'Solde insuffisant' });
            }

            // Démarrer une transaction
            await pool.query('BEGIN');

            try {
                // Mettre à jour le solde
                await pool.query(
                    'UPDATE users SET balance = balance - $1 WHERE id = $2',
                    [totalCost, userId]
                );

                // Mettre à jour le portefeuille
                await pool.query(
                    `INSERT INTO crypto_wallets (user_id, symbol, balance) 
                    VALUES ($1, $2, $3) 
                    ON CONFLICT (user_id, symbol) 
                    DO UPDATE SET balance = crypto_wallets.balance + $3`,
                    [userId, symbol, amount]
                );

                // Enregistrer la transaction
                await pool.query(
                    `INSERT INTO transactions 
                    (user_id, symbol, type, amount, price, total_value) 
                    VALUES ($1, $2, 'buy', $3, $4, $5)`,
                    [userId, symbol, amount, price, totalCost]
                );

                await pool.query('COMMIT');
                res.json({ message: 'Achat effectué avec succès' });
            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Erreur lors de l\'achat:', error);
            res.status(500).json({ error: 'Erreur lors de l\'achat: ' + error.message });
        }
    },

    // Vendre une cryptomonnaie
    sellCrypto: async (req, res) => {
        const { symbol, amount } = req.body;
        const userId = req.user.id;

        try {
            // Vérifier le solde en crypto
            const walletResult = await pool.query(
                'SELECT balance FROM crypto_wallets WHERE user_id = $1 AND symbol = $2',
                [userId, symbol]
            );

            if (walletResult.rows.length === 0 || walletResult.rows[0].balance < amount) {
                return res.status(400).json({ error: 'Solde en crypto insuffisant' });
            }

            // Obtenir le prix actuel
            const priceResult = await pool.query(
                'SELECT current_price FROM cryptocurrencies WHERE symbol = $1',
                [symbol]
            );

            if (priceResult.rows.length === 0) {
                return res.status(404).json({ error: 'Cryptomonnaie non trouvée' });
            }

            const price = priceResult.rows[0].current_price;
            const totalValue = price * amount;

            // Démarrer une transaction
            await pool.query('BEGIN');

            try {
                // Mettre à jour le solde en crypto
                await pool.query(
                    'UPDATE crypto_wallets SET balance = balance - $1 WHERE user_id = $2 AND symbol = $3',
                    [amount, userId, symbol]
                );

                // Mettre à jour le solde en euros
                await pool.query(
                    'UPDATE users SET balance = balance + $1 WHERE id = $2',
                    [totalValue, userId]
                );

                // Enregistrer la transaction
                await pool.query(
                    `INSERT INTO transactions 
                    (user_id, symbol, type, amount, price, total_value) 
                    VALUES ($1, $2, 'sell', $3, $4, $5)`,
                    [userId, symbol, amount, price, totalValue]
                );

                await pool.query('COMMIT');
                res.json({ message: 'Vente effectuée avec succès' });
            } catch (error) {
                await pool.query('ROLLBACK');
                throw error;
            }
        } catch (error) {
            console.error('Erreur lors de la vente:', error);
            res.status(500).json({ error: 'Erreur lors de la vente: ' + error.message });
        }
    },

    // Obtenir l'historique des transactions
    getTransactionHistory: async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT t.*, u.email 
                FROM transactions t 
                JOIN users u ON t.user_id = u.id 
                ORDER BY t.created_at DESC 
                LIMIT 100`
            );
            res.json(result.rows || []); // Assurer qu'on renvoie au moins un tableau vide
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    },

    // Obtenir mes transactions
    getMyTransactions: async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT * FROM transactions 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT 20`,
                [req.user.id]
            );
            res.json(result.rows || []); // Assurer qu'on renvoie au moins un tableau vide
        } catch (error) {
            console.error('Erreur lors de la récupération des transactions:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
};

module.exports = cryptoController;
