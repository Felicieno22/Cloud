const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
    console.log('Middleware d\'authentification appelé');
    console.log('URL appelée:', req.originalUrl);
    console.log('Méthode:', req.method);
    console.log('Headers complets:', JSON.stringify(req.headers, null, 2));

    try {
        // Vérifier la présence du header Authorization
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            console.log('Header Authorization manquant');
            return res.status(401).json({ 
                message: 'Header Authorization manquant',
                code: 'AUTH_HEADER_MISSING'
            });
        }

        // Vérifier le format Bearer
        if (!authHeader.startsWith('Bearer ')) {
            console.log('Format du token invalide (doit commencer par Bearer)');
            return res.status(401).json({ 
                message: 'Format du token invalide',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Extraire le token
        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('Token manquant après Bearer');
            return res.status(401).json({ 
                message: 'Token manquant',
                code: 'TOKEN_MISSING'
            });
        }

        console.log('Token trouvé, longueur:', token.length);

        // Vérifier et décoder le token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Token décodé avec succès:', { userId: decoded.id, username: decoded.username });
        } catch (jwtError) {
            console.error('Erreur de vérification JWT:', {
                name: jwtError.name,
                message: jwtError.message
            });

            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token expiré',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            return res.status(403).json({ 
                message: 'Token invalide',
                code: 'INVALID_TOKEN',
                details: jwtError.message
            });
        }

        // Vérifier l'existence de l'utilisateur et son rôle admin
        try {
            const result = await pool.query(`
                SELECT u.id, u.username, r.name as role_name
                FROM users u
                LEFT JOIN users_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.id = $1
            `, [decoded.id]);

            if (result.rows.length === 0) {
                console.log('Utilisateur non trouvé en base de données:', decoded.id);
                return res.status(401).json({ 
                    message: 'Utilisateur non trouvé',
                    code: 'USER_NOT_FOUND'
                });
            }

            const user = result.rows[0];
            
            // Vérifier si l'utilisateur a le rôle admin pour les routes admin
            if (req.originalUrl.includes('/admin') && user.role_name !== 'admin') {
                console.log('Accès refusé : droits administrateur requis');
                return res.status(403).json({ 
                    message: 'Non authentifié ou droits insuffisants',
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            req.user = user;
            console.log('Authentification réussie pour:', {
                userId: req.user.id,
                username: req.user.username,
                role: req.user.role_name
            });

            next();
        } catch (dbError) {
            console.error('Erreur base de données:', dbError);
            return res.status(500).json({ 
                message: 'Erreur serveur lors de la vérification de l\'utilisateur',
                code: 'DB_ERROR'
            });
        }
    } catch (error) {
        console.error('Erreur inattendue dans le middleware:', error);
        return res.status(500).json({ 
            message: 'Erreur serveur inattendue',
            code: 'UNEXPECTED_ERROR'
        });
    }
};

module.exports = authenticateToken;
