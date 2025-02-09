
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json'); // Remplacer le chemin par celui de votre clé JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;