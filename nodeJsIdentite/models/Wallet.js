const { Pool } = require('pg');
const pool = require('../db');

class Wallet {
    static async createWallet(userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                'INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *',
                [userId]
            );
            await client.query('COMMIT');
            return result.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    static async getBalance(userId) {
        const result = await pool.query(
            'SELECT balance FROM wallets WHERE user_id = $1',
            [userId]
        );
        return result.rows[0]?.balance || 0;
    }

    static async updateBalance(userId, amount) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                'UPDATE wallets SET balance = balance + $2 WHERE user_id = $1 RETURNING *',
                [userId, amount]
            );
            await client.query('COMMIT');
            return result.rows[0];
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}

module.exports = Wallet;
