const pool = require('../db');

class Cryptocurrency {
    static async getAllCryptos() {
        const result = await pool.query(`
            SELECT c.*, c.prix as current_price 
            FROM crypto c 
            ORDER BY c.name
        `);
        return result.rows;
    }

    static async getCryptoPrice(cryptoId) {
        const result = await pool.query(
            'SELECT prix as current_price FROM crypto WHERE idCrypto = $1',
            [cryptoId]
        );
        return result.rows[0]?.current_price;
    }

    static async updatePrice(cryptoId, newPrice) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Mettre à jour le prix dans l'historique
            await client.query(
                'INSERT INTO cryptocurrency_prices (crypto_id, current_price) VALUES ($1, $2)',
                [cryptoId, newPrice]
            );
            
            // Mettre à jour le prix actuel
            await client.query(
                'UPDATE crypto SET prix = $1, last_updated = CURRENT_TIMESTAMP WHERE idCrypto = $2',
                [newPrice, cryptoId]
            );
            
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getPriceHistory(cryptoId, limit = 100) {
        const result = await pool.query(
            'SELECT current_price, timestamp FROM cryptocurrency_prices WHERE crypto_id = $1 ORDER BY timestamp DESC LIMIT $2',
            [cryptoId, limit]
        );
        return result.rows;
    }

    static async getHoldings(walletId) {
        const result = await pool.query(`
            SELECT 
                ch.idCrypto as crypto_id,
                c.name,
                c.symbol,
                ch.amount,
                c.prix as current_price
            FROM crypto_holdings ch
            JOIN crypto c ON ch.idCrypto = c.idCrypto
            WHERE ch.wallet_id = $1
        `, [walletId]);
        return result.rows;
    }

    static async buy(buyerWalletId, sellerWalletId, cryptoId, amount, pricePerUnit) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Vérifier le solde du portefeuille de l'acheteur
            const totalPrice = amount * pricePerUnit;
            const buyerWallet = await client.query(
                'SELECT balance FROM wallets WHERE id = $1 FOR UPDATE',
                [buyerWalletId]
            );

            if (buyerWallet.rows[0].balance < totalPrice) {
                throw new Error('Solde insuffisant');
            }

            // Mettre à jour les soldes
            await client.query(
                'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
                [totalPrice, buyerWalletId]
            );
            await client.query(
                'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
                [totalPrice, sellerWalletId]
            );

            // Mettre à jour les holdings
            await client.query(`
                INSERT INTO crypto_holdings (wallet_id, idCrypto, amount)
                VALUES ($1, $2, $3)
                ON CONFLICT (wallet_id, idCrypto)
                DO UPDATE SET amount = crypto_holdings.amount + EXCLUDED.amount
            `, [buyerWalletId, cryptoId, amount]);

            await client.query(`
                UPDATE crypto_holdings 
                SET amount = amount - $1
                WHERE wallet_id = $2 AND idCrypto = $3
            `, [amount, sellerWalletId, cryptoId]);

            // Enregistrer la transaction
            await client.query(
                'INSERT INTO crypto_transactions (buyer_wallet_id, seller_wallet_id, crypto_id, amount, price_per_unit, total_price) VALUES ($1, $2, $3, $4, $5, $6)',
                [buyerWalletId, sellerWalletId, cryptoId, amount, pricePerUnit, totalPrice]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = Cryptocurrency;
