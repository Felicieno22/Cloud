const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/portfolio/:wallet_id - liste des positions du portefeuille
router.get('/:wallet_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pp.*, c.symbol, c.name, c.current_price 
       FROM portfolio_positions pp 
       JOIN cryptocurrencies c ON pp.crypto_id = c.id 
       WHERE pp.wallet_id = $1`,
      [req.params.wallet_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des positions du portefeuille.' });
  }
});

module.exports = router;