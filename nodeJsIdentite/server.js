const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const path = require('path');
const pool = require('./db');
const PriceGenerator = require('./services/PriceGenerator');
const nodemailer = require('nodemailer');

const app = express();

// Configuration des middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Configuration de la session
app.use(session({
    secret: process.env.SESSION_SECRET || 'votre_secret_session_ici',
    resave: false,
    saveUninitialized: false
}));

// Configuration de Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Variables globales pour les messages
app.use((req, res, next) => {
    res.locals.messages = {
        error: req.flash('error'),
        success: req.flash('success')
    };
    next();
});

// Configuration de la stratégie locale
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            console.log('Tentative de connexion pour:', email);
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            
            if (result.rows.length === 0) {
                console.log('Utilisateur non trouvé');
                return done(null, false, { message: 'Email non trouvé' });
            }

            const user = result.rows[0];
            console.log('Utilisateur trouvé:', user.email);
            
            if (!user.password_hash) {
                console.log('Pas de mot de passe hashé trouvé');
                return done(null, false, { message: 'Erreur de connexion' });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            console.log('Résultat de la comparaison:', isMatch);
            
            if (!isMatch) {
                console.log('Mot de passe incorrect');
                return done(null, false, { message: 'Mot de passe incorrect' });
            }

            console.log('Connexion réussie');
            return done(null, user);
        } catch (error) {
            console.error('Erreur lors de l\'authentification:', error);
            return done(error);
        }
    }
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

// Routes principales
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('login', { messages: { error: req.flash('error') } });
});

app.get('/register', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('register');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'Veuillez vous connecter pour accéder à cette page');
        return res.redirect('/login');
    }
    res.render('dashboard', { user: req.user });
});

// Routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const walletRouter = require('./routes/wallet');
const cryptoRouter = require('./routes/crypto');

app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/crypto', cryptoRouter);

// Routes pour la vérification d'email
app.get('/verify-email', (req, res) => {
    const email = req.query.email;
    if (!email) {
        req.flash('error', 'Email manquant');
        return res.redirect('/login');
    }
    res.render('verify-email', { email });
});

app.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;

        // Vérifier le code
        const result = await pool.query(
            `SELECT user_id, email_verification_expiry 
             FROM user_security 
             WHERE email_verification_token = $1 
             AND email_verification_expiry > CURRENT_TIMESTAMP`,
            [code]
        );

        if (result.rows.length === 0) {
            return res.render('verify-email', { 
                email, 
                error: 'Code invalide ou expiré' 
            });
        }

        // Marquer l'email comme vérifié
        await pool.query(
            `UPDATE user_security 
             SET is_email_verified = true, 
                 email_verification_token = NULL, 
                 email_verification_expiry = NULL 
             WHERE user_id = $1`,
            [result.rows[0].user_id]
        );

        res.render('verify-email', { 
            email, 
            verified: true,
            message: 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter' 
        });

    } catch (error) {
        console.error('Erreur lors de la vérification du code:', error);
        res.render('verify-email', { 
            email: req.body.email, 
            error: 'Une erreur est survenue lors de la vérification' 
        });
    }
});

app.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        // Vérifier si l'utilisateur existe
        const userResult = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.render('verify-email', { 
                email, 
                error: 'Utilisateur non trouvé' 
            });
        }

        const userId = userResult.rows[0].id;

        // Générer un nouveau code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24);

        // Mettre à jour le code dans la base de données
        await pool.query(
            `UPDATE user_security 
             SET email_verification_token = $1, 
                 email_verification_expiry = $2 
             WHERE user_id = $3`,
            [verificationCode, tokenExpiry, userId]
        );

        // Envoyer le nouveau code par email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Nouveau code de vérification - Crypto Exchange',
            html: `
                <h1>Nouveau code de vérification</h1>
                <p>Voici votre nouveau code de vérification :</p>
                <h2 style="font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">${verificationCode}</h2>
                <p>Ce code expirera dans 24 heures.</p>
                <p>Si vous n'avez pas demandé ce code, veuillez ignorer cet email.</p>
            `
        };

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail(mailOptions);

        res.render('verify-email', { 
            email, 
            message: 'Un nouveau code de vérification a été envoyé à votre adresse email' 
        });

    } catch (error) {
        console.error('Erreur lors du renvoi du code:', error);
        res.render('verify-email', { 
            email: req.body.email, 
            error: 'Une erreur est survenue lors de l\'envoi du nouveau code' 
        });
    }
});

// Test de la connexion à la base de données et démarrage du générateur de prix
pool.connect()
    .then(async () => {
        console.log('Connecté à la base de données PostgreSQL');
        
        // Démarrer le générateur de prix
        const priceGenerator = require('./services/priceGenerator');
        priceGenerator.start();
    })
    .catch(err => {
        console.error('Erreur de connexion à la base de données:', err);
    });

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});