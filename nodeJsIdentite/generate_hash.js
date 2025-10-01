const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'TestUser123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Hash du mot de passe pour TestUser123:', hash);
}

generateHash();
