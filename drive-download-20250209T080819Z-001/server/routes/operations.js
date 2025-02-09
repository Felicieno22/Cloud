// Nom du fichier: operations.js
// filepath: /server/routes/operations.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendNotification } = require('../sendNotification');

// Exemple d'enregistrement d'une opération qui déclenche une notification
router.post('/operation', async (req, res) => {
  const { user_id, operation_type, crypto_id, details } = req.body;
  
  try {
    // Enregistrer l'opération dans la table "operations"
    const opResult = await db.query(
      'INSERT INTO operations (user_id, operation_type, status, details) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, operation_type, 'COMPLETED', details]
    );
    
    // Récupérer le token de l'appareil de l'utilisateur (voir table user_devices)
    const deviceResult = await db.query(
      'SELECT device_token FROM user_devices WHERE user_id = $1',
      [user_id]
    );
    
    // Exemple: envoyer une notification lorsque l'opération concerne une crypto favorite
    const title = 'Mise à jour de votre portefeuille';
    const body = `Une opération de type ${operation_type} a été effectuée sur vos cryptomonnaies favorites.`;
    
    // Envoyer la notification à chaque appareil enregistré
    deviceResult.rows.forEach(async (row) => {
      await sendNotification(row.device_token, title, body);
    });
    
    res.status(201).json(opResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du traitement de l\'opération.' });
  }
});

module.exports = router;