const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const nodemailer = require('nodemailer');
const authenticateToken = require('../middleware/auth');

// Configuration de l'envoi d'emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Get wallet info
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || { balance: 0 });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get positions
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM portfolio_positions WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)',
      [req.user.id]
    );
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create deposit request
router.post('/deposit-request', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Get or create wallet
    let walletResult = await client.query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [req.user.id]
    );


    let walletId;
    if (walletResult.rows.length === 0) {
      const newWallet = await client.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id',
        [req.user.id]
      );
      walletId = newWallet.rows[0].id;
    } else {
      walletId = walletResult.rows[0].id;
    }

    // Create pending transaction
    await client.query(
      `INSERT INTO transactions 
      (wallet_id, type, amount, status, details) 
      VALUES ($1, 'deposit', $2, 'pending', 'Deposit request pending admin approval')`,
      [walletId, amount]
    );

    await client.query('COMMIT');
    res.json({ message: 'Deposit request created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating deposit request:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// Create withdrawal request
router.post('/withdrawal-request', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Check wallet and balance
    const walletResult = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [req.user.id]
    );


    if (walletResult.rows.length === 0) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    const wallet = walletResult.rows[0];
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create pending transaction
    await client.query(
      `INSERT INTO transactions 
      (wallet_id, type, amount, status, details) 
      VALUES ($1, 'withdraw', $2, 'pending', 'Withdrawal request pending admin approval')`,
      [wallet.id, amount]
    );

    await client.query('COMMIT');
    res.json({ message: 'Withdrawal request created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;

