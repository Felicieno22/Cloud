const jwt = require('jsonwebtoken');
require('dotenv').config();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Non autorisé' });
};

const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom
        },
        process.env.JWT_SECRET || 'votre_secret_ici',
        { expiresIn: '24h' }
    );
};

module.exports = {
    isAuthenticated,
    generateToken
};
