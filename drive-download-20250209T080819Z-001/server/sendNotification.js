// Nom du fichier: sendNotification.js
// filepath: /server/sendNotification.js
const admin = require('./firebaseAdmin');

/**
 * sendNotification: Envoie une notification mobile via Firebase Cloud Messaging
 * @param {string} deviceToken - Le token de l'appareil destinataire
 * @param {string} title - Titre de la notification
 * @param {string} body - Contenu du message
 */
async function sendNotification(deviceToken, title, body) {
  const message = {
    notification: { title, body },
    token: deviceToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification envoyée avec succès:', response);
    return response;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error);
    throw error;
  }
}

module.exports = { sendNotification };