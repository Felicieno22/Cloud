const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('../db');

function initialize(passport) {
    const authenticateUser = async (email, password, done) => {
        try {
            // Vérifier si l'utilisateur existe
            const result = await pool.query(
                'SELECT u.*, us.is_email_verified FROM users u LEFT JOIN user_security us ON u.id = us.user_id WHERE u.email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return done(null, false, { message: 'Email ou mot de passe incorrect' });
            }

            const user = result.rows[0];

            // Vérifier si l'email est vérifié
            if (!user.is_email_verified) {
                return done(null, false, { 
                    message: 'Veuillez vérifier votre email avant de vous connecter',
                    redirectTo: `/verify-email?email=${email}`
                });
            }

            // Vérifier le mot de passe
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return done(null, false, { message: 'Email ou mot de passe incorrect' });
            }

            // Authentification réussie
            return done(null, user);

        } catch (error) {
            return done(error);
        }
    };

    passport.use(new LocalStrategy(
        { usernameField: 'email', passwordField: 'password' },
        authenticateUser
    ));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            done(null, result.rows[0]);
        } catch (error) {
            done(error);
        }
    });
}

module.exports = initialize;
