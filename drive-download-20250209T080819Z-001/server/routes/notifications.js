// Nom du fichier: notifications.js
// filepath: /server/routes/notifications.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/notifications/:user_id - Récupérer la liste des notifications pour un utilisateur
router.get('/:user_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications.' });
  }
});

// POST /api/notifications - Créer et enregistrer une notification dans la base de données
router.post('/', async (req, res) => {
  const { user_id, title, message } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO notifications (user_id, title, message, read) VALUES ($1, $2, $3, false) RETURNING *',
      [user_id, title, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la notification.' });
  }
});

module.exports = router;