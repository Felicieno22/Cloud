const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'crypto_db',
    password: 'PostgresCedy',
    port: 5432
});

module.exports = { pool };
