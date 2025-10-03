const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'crypto_db',
    password: 'PostgresCedy',
    port: 5432,
});

async function createAdmin() {
    try {
        // Hash du mot de passe
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertion dans la base de données
        const result = await pool.query(
            'INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING *',
            ['admin', 'admin@cryptotrade.com', hashedPassword]
        );

        console.log('Administrateur créé avec succès:', result.rows[0]);
    } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur:', error);
    } finally {
        // Fermer la connexion
        await pool.end();
    }
}

createAdmin();
