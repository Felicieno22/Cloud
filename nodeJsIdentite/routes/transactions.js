const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtenir l'historique des achats/ventes
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM achatvente_history');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une nouvelle transaction achat/vente
router.post('/', async (req, res) => {
  const { idUserProprio, idUserAcheteur, idCrypto, montant } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO achatVente (idUserProprio, idUserAcheteur, idCrypto, montant) VALUES ($1, $2, $3, $4) RETURNING *',
      [idUserProprio, idUserAcheteur, idCrypto, montant]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 