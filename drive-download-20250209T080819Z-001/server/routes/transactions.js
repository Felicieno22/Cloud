const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/transactions/:wallet_id - liste des transactions pour un portefeuille
router.get('/:wallet_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM transactions WHERE wallet_id = $1 ORDER BY created_at DESC',
      [req.params.wallet_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des transactions.' });
  }
});

// POST /api/transactions - créer une nouvelle transaction
router.post('/', async (req, res) => {
  const { wallet_id, crypto_id, type, amount, quantity, price, details } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO transactions (wallet_id, crypto_id, type, amount, quantity, price, status, details)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7) RETURNING *`,
      [wallet_id, crypto_id, type, amount, quantity, price, details]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la transaction.' });
  }
});

module.exports = router;