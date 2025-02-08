const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations() {
    try {
        console.log('Début de l\'exécution des migrations...');
        
        // Lire le fichier de migration
        const migrationPath = path.join(__dirname, '../migrations/add_photo_column.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Exécuter la migration
        await pool.query(migrationSQL);
        
        console.log('Migration terminée avec succès !');
        process.exit(0);
    } catch (error) {
        console.error('Erreur lors de l\'exécution des migrations:', error);
        process.exit(1);
    }
}

runMigrations(); 