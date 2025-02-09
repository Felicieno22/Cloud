const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/crypto : renvoie la liste des cryptomonnaies avec leurs cours actuels
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT coin_id, symbol, name, current_price, market_cap, price_change_24h, last_updated FROM cryptocurrencies ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
  }
});

module.exports = router;