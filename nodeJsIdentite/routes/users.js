const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// Obtenir le portfolio d'un utilisateur
router.get('/:id/portfolio', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM user_portfolio WHERE user_id = $1',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Effectuer un dépôt
router.post('/:id/depot', async (req, res) => {
  const { id } = req.params;
  const { idCrypto, montant } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO depot (idUser, idCrypto, montant) VALUES ($1, $2, $3) RETURNING *',
      [id, idCrypto, montant]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Effectuer un retrait
router.post('/:id/retrait', async (req, res) => {
  const { id } = req.params;
  const { idCrypto, montant } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO retrait (idUser, idCrypto, montant) VALUES ($1, $2, $3) RETURNING *',
      [id, idCrypto, montant]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un nouvel utilisateur
router.post('/', async (req, res) => {
  const { nom, prenom, email, date_naissance, ville, password } = req.body;
  
  // Vérification des champs requis
  if (!nom || !prenom || !email || !date_naissance || !ville || !password) {
    return res.status(400).json({ 
      error: "Tous les champs sont requis (nom, prenom, email, date_naissance, ville, password)" 
    });
  }

  try {
    // Vérifier si l'email existe déjà
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (nom, prenom, email, date_naissance, ville, password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nom, prenom, email, date_naissance, ville, created_at',
      [nom, prenom, email, date_naissance, ville, hashedPassword]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de la création de l\'utilisateur:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 