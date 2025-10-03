const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const dbConfig = require('../backend/config/database');

const pool = new Pool(dbConfig);

async function updateAdminPassword() {
    try {
        const username = 'admin';
        const password = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Vérifiez si l'admin existe déjà
        const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);

        if (result.rows.length > 0) {
            // Mettre à jour le mot de passe
            await pool.query('UPDATE admins SET password = $1 WHERE username = $2', [hashedPassword, username]);
            console.log('Mot de passe admin mis à jour avec succès');
        } else {
            // Insérer un nouvel admin
            await pool.query('INSERT INTO admins (username, password) VALUES ($1, $2)', [username, hashedPassword]);
            console.log('Nouvel admin créé avec succès');
        }

        process.exit(0);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        process.exit(1);
    }
}

updateAdminPassword();
