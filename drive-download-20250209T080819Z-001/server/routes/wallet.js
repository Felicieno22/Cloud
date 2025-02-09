const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/wallet/:user_id - récupérer le portefeuille d'un utilisateur
router.get('/:user_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [req.params.user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération du portefeuille.' });
  }
});

module.exports = router;