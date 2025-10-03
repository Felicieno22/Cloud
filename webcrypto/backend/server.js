require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const priceGenerator = require('./utils/priceGenerator');
const { pool } = require('./config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Créer le dossier images s'il n'existe pas
const uploadDir = path.join(__dirname, 'public/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Fonction utilitaire pour convertir une image base64 en fichier
const convertBase64ToFile = async (base64String, userId) => {
  try {
    // Extraire les données base64 (enlever le préfixe data:image/...)
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 string');
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    const fileName = `${Date.now()}-user-${userId}.jpg`;
    const filePath = path.join(uploadDir, fileName);

    // Sauvegarder le fichier
    await fs.promises.writeFile(filePath, imageBuffer);
    
    // Retourner l'URL du fichier
    return `http://localhost:3000/images/${fileName}`;
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    throw error;
  }
};

// Configuration de multer pour le stockage des images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Le fichier doit être une image'));
    }
  }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8080", "http://localhost:8081"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Test de la connexion à la base de données
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connecté à la base de données PostgreSQL');
  }
});

// Configuration CORS
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:8081"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Servir les fichiers statiques
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Middleware d'authentification admin
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Vérifier si l'utilisateur existe et a le rôle admin
    const result = await pool.query(`
      SELECT u.* FROM users u
      JOIN users_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND r.name = 'admin'
    `, [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Accès non autorisé' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Erreur d\'authentification admin:', err);
    res.status(401).json({ error: 'Token invalide' });
  }
};

// Middleware d'authentification utilisateur
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    // D'abord, essayer comme token de session
    const sessionResult = await pool.query(`
      SELECT s.*, u.* 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `, [token]);

    if (sessionResult.rows.length > 0) {
      req.user = sessionResult.rows[0];
      return next();
    }

    // Si ce n'est pas un token de session, essayer comme JWT
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
      }
      req.user = result.rows[0];
      next();
    } catch (jwtError) {
      console.error('Erreur JWT:', jwtError);
      return res.status(401).json({ error: 'Token invalide' });
    }
  } catch (err) {
    console.error('Erreur d\'authentification utilisateur:', err);
    res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

// Route de connexion admin
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Tentative de connexion admin avec:', { email, password: '***' });

  try {
    // Vérifier si l'utilisateur existe et a le rôle admin
    const query = `
      SELECT u.*, r.name as role_name 
      FROM users u
      JOIN users_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.email = $1 AND r.name = 'admin'
    `;
    console.log('Exécution de la requête:', query);
    
    const result = await pool.query(query, [email]);
    console.log('Résultat de la requête:', { 
      userFound: result.rows.length > 0,
      userId: result.rows[0]?.id,
      userEmail: result.rows[0]?.email,
      userRole: result.rows[0]?.role_name
    });

    if (result.rows.length === 0) {
      console.log('Utilisateur non trouvé ou pas de rôle admin');
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const user = result.rows[0];
    console.log('Comparaison des mots de passe:', {
      providedPassword: password,
      storedHash: user.password_hash
    });
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Résultat de la vérification du mot de passe:', { validPassword });

    if (!validPassword) {
      console.log('Mot de passe invalide');
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    console.log('Token généré avec succès pour l\'utilisateur:', user.id);
    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Erreur de connexion admin:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir les statistiques
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const [pendingRequests, activeUsers, volume] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM transactions WHERE status = $1', ['PENDING']),
      pool.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status = 'COMPLETED'
      `)
    ]);

    res.json({
      pendingRequests: parseInt(pendingRequests.rows[0].count),
      activeUsers: parseInt(activeUsers.rows[0].count),
      totalVolume: parseFloat(volume.rows[0].total)
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des stats:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir les demandes en attente
app.get('/api/admin/pending-requests', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        u.username,
        u.email,
        w.user_id,
        w.balance as wallet_balance
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      WHERE t.status = 'PENDING'
      AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
      ORDER BY t.created_at DESC
    `);

    // Formater les données pour correspondre à la structure attendue par le frontend
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      type: row.type.toLowerCase(),
      amount: row.amount,
      status: row.status,
      created_at: row.created_at,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email
      },
      wallet_balance: row.wallet_balance
    }));

    res.json(formattedRequests);
  } catch (err) {
    console.error('Erreur lors de la récupération des demandes:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour traiter une demande
app.post('/api/admin/requests/:id/:action', authenticateAdmin, async (req, res) => {
  const { id, action } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const requestResult = await client.query(`
      SELECT t.*, w.user_id, w.id as wallet_id
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      WHERE t.id = $1 AND t.status = 'PENDING'
    `, [id]);

    if (requestResult.rows.length === 0) {
      throw new Error('Demande non trouvée ou déjà traitée');
    }

    const request = requestResult.rows[0];
    const newStatus = action === 'approve' ? 'COMPLETED' : 'REJECTED';

    if (action === 'approve') {
      if (request.type === 'DEPOSIT') {
        // Mettre à jour le solde du portefeuille
        await client.query(
          'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
          [request.amount, request.wallet_id]
        );
      } else if (request.type === 'WITHDRAWAL' && newStatus === 'COMPLETED') {
        // Vérifier le solde disponible
        const walletResult = await client.query(
          'SELECT balance FROM wallets WHERE id = $1',
          [request.wallet_id]
        );
        
        if (walletResult.rows[0].balance < request.amount) {
          throw new Error('Solde insuffisant');
        }

        // Mettre à jour le solde du portefeuille
        await client.query(
          'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
          [request.amount, request.wallet_id]
        );
      }
    }

    // Mettre à jour le statut de la transaction
    await client.query(
      'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, id]
    );

    // Créer une notification pour l'utilisateur
    await client.query(
      'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
      [
        request.user_id,
        `${request.type === 'DEPOSIT' ? 'Dépôt' : 'Retrait'} ${newStatus === 'COMPLETED' ? 'approuvé' : 'rejeté'}`,
        `Votre demande de ${request.type === 'DEPOSIT' ? 'dépôt' : 'retrait'} de ${request.amount} USD a été ${newStatus === 'COMPLETED' ? 'approuvée' : 'rejetée'}.`
      ]
    );

    await client.query('COMMIT');

    // Récupérer les données mises à jour
    const [updatedWallet, updatedTransactions] = await Promise.all([
      pool.query('SELECT * FROM wallets WHERE id = $1', [request.wallet_id]),
      pool.query(`
        SELECT * FROM transactions 
        WHERE wallet_id = $1 
        ORDER BY created_at DESC LIMIT 50
      `, [request.wallet_id])
    ]);

    // Émettre les mises à jour via WebSocket pour l'utilisateur concerné
    io.emit(`user:${request.user_id}:walletUpdate`, updatedWallet.rows[0]);
    io.emit(`user:${request.user_id}:transactionsUpdate`, updatedTransactions.rows);
    io.emit(`user:${request.user_id}:requestProcessed`, {
      type: request.type.toLowerCase(),
      amount: request.amount,
      status: newStatus.toLowerCase()
    });

    res.json({ message: 'Demande traitée avec succès' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors du traitement de la demande:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Route pour créer une demande de dépôt/retrait
app.post('/api/wallet/request', authenticateUser, async (req, res) => {
  const { type, amount } = req.body;
  const userId = req.user.id;

  if (!['deposit', 'withdrawal'].includes(type)) {
    return res.status(400).json({ error: 'Type de transaction invalide' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (type === 'withdrawal') {
      // Vérifier le solde disponible
      const walletResult = await client.query(
        'SELECT balance FROM wallets WHERE user_id = $1',
        [userId]
      );
      
      if (walletResult.rows[0].balance < amount) {
        throw new Error('Solde insuffisant');
      }
    }

    // Créer la transaction
    await client.query(
      'INSERT INTO transactions (user_id, type, amount, status) VALUES ($1, $2, $3, $4)',
      [userId, type, amount, 'pending']
    );

    await client.query('COMMIT');
    res.json({ message: 'Demande créée avec succès' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la demande:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Route pour obtenir toutes les cryptomonnaies
app.get('/api/cryptocurrencies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cryptocurrencies ORDER BY market_cap DESC');
    console.log('Cryptomonnaies récupérées:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des cryptomonnaies:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir l'historique des prix d'une crypto
app.get('/api/cryptocurrencies/:symbol/history', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const result = await pool.query(
      `SELECT h.price, h.created_at 
       FROM crypto_price_history h
       JOIN cryptocurrencies c ON c.id = h.crypto_id
       WHERE c.symbol = $1
       ORDER BY h.created_at DESC
       LIMIT 100`,
      [symbol]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération de l\'historique:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour l'upload d'image
app.post('/api/upload/image', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      // Si pas de fichier uploadé, vérifier si c'est une image base64
      const base64Image = req.body.image;
      if (base64Image && base64Image.startsWith('data:image/')) {
        const imageUrl = await convertBase64ToFile(base64Image, req.user.id);
        return res.json({
          success: true,
          imageUrl: imageUrl
        });
      }
      throw new Error('Aucun fichier n\'a été uploadé');
    }

    // Construire l'URL du fichier
    const imageUrl = `http://localhost:3000/images/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mise à jour des prix toutes les 10 secondes
const updatePrices = async () => {
  try {
    // Récupérer toutes les cryptos
    const result = await pool.query('SELECT * FROM cryptocurrencies');
    const cryptos = result.rows;
    console.log('Mise à jour des prix pour', cryptos.length, 'cryptomonnaies');

    // Mettre à jour chaque crypto
    for (const crypto of cryptos) {
      const newPrice = priceGenerator.updatePrice(crypto.current_price);
      const priceChange = ((newPrice - crypto.current_price) / crypto.current_price) * 100;

      console.log(`Mise à jour ${crypto.symbol}: ${crypto.current_price} -> ${newPrice} (${priceChange}%)`);

      // Mettre à jour la base de données et sauvegarder l'historique
      await pool.query(
        `WITH updated_crypto AS (
          UPDATE cryptocurrencies 
          SET current_price = $1, price_change_24h = $2, last_updated = CURRENT_TIMESTAMP 
          WHERE id = $3
          RETURNING id
        )
        INSERT INTO crypto_price_history (crypto_id, price)
        SELECT id, $1
        FROM updated_crypto`,
        [newPrice, priceChange, crypto.id]
      );
    }

    // Envoyer les données mises à jour
    const updatedResult = await pool.query('SELECT * FROM cryptocurrencies ORDER BY market_cap DESC');
    const formattedCryptos = updatedResult.rows.map(crypto => ({
      id: crypto.id,
      symbol: crypto.symbol,
      name: crypto.name,
      price: parseFloat(crypto.current_price),
      priceChange: parseFloat(crypto.price_change_24h),
      marketCap: parseFloat(crypto.market_cap)
    }));

    console.log('Envoi des données mises à jour:', formattedCryptos);
    io.emit('priceUpdate', formattedCryptos);
  } catch (err) {
    console.error('Erreur lors de la mise à jour des prix:', err);
  }
};

// Démarrer la mise à jour des prix
setInterval(updatePrices, 10000);

// Middleware pour vérifier les droits admin dans les sockets
const checkAdminRights = async (socket) => {
  try {
    const userId = socket.user?.id;
    if (!userId) return false;

    const result = await pool.query(`
      SELECT r.name as role_name
      FROM users u
      JOIN users_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1 AND r.name = 'admin'
    `, [userId]);

    return result.rows.length > 0;
  } catch (error) {
    console.error('Erreur lors de la vérification des droits admin:', error);
    return false;
  }
};

io.on('connection', async (socket) => {
  console.log('Client connecté');
  
  // Handle wallet authentication
  socket.on('authenticate', async (token) => {
    try {
      console.log('Tentative d\'authentification avec token:', token);
      
      // Essayer d'abord comme token de session
      const sessionResult = await pool.query(`
        SELECT s.*, u.id as user_id 
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 AND s.expires_at > NOW()
      `, [token]);

      if (sessionResult.rows.length > 0) {
        const session = sessionResult.rows[0];
        socket.userId = session.user_id;
        console.log('Utilisateur authentifié via session:', socket.userId);
      } else {
        // Si ce n'est pas un token de session, essayer comme JWT
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
          console.log('Utilisateur authentifié via JWT:', socket.userId);
        } catch (jwtError) {
          console.error('Erreur JWT:', jwtError);
          throw new Error('Token invalide');
        }
      }
      
      // Envoyer un événement d'authentification réussie
      socket.emit('authenticated');
      
      // Récupérer les données du wallet et les transactions
      const [walletResult, transactionsResult] = await Promise.all([
        pool.query('SELECT * FROM wallets WHERE user_id = $1', [socket.userId]),
        pool.query(`
          SELECT * FROM transactions 
                   WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)
          ORDER BY created_at DESC LIMIT 50
        `, [socket.userId])
      ]);

      const wallet = walletResult.rows[0] || { balance: 0 };
      
      // Envoyer les données du wallet
      socket.emit('walletUpdate', {
        id: wallet.id,
        balance: parseFloat(wallet.balance),
        user_id: socket.userId
      });

      // Envoyer l'historique des transactions
      socket.emit('transactionsUpdate', transactionsResult.rows);

    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('error', { message: 'Erreur d\'authentification: ' + error.message });
    }
  });

  // Mise à jour de la photo de profil
  socket.on('updateUserPhoto', async (data) => {
    try {
      const { photo, password } = data;
      
      if (!socket.userId) {
        console.error('Tentative de mise à jour de photo sans authentification');
        throw new Error('Non authentifié');
      }

      console.log('Début de mise à jour de photo pour l\'utilisateur:', socket.userId);

      // Vérifier le format de la photo
      if (!photo || !photo.startsWith('http')) {
        console.error('Format de photo invalide');
        throw new Error('Format de photo invalide - l\'URL doit commencer par http');
      }

      // Vérifier le mot de passe
      console.log('Vérification du mot de passe...');
      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [socket.userId]);
      if (userResult.rows.length === 0) {
        console.error('Utilisateur non trouvé:', socket.userId);
        throw new Error('Utilisateur non trouvé');
      }

      const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!validPassword) {
        console.error('Mot de passe incorrect pour l\'utilisateur:', socket.userId);
        throw new Error('Mot de passe incorrect');
      }

      console.log('Mot de passe vérifié, mise à jour de la photo...');

      // Mettre à jour la photo dans la base de données
      const updateResult = await pool.query(
        'UPDATE users SET photo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username, photo',
        [photo, socket.userId]
      );

      if (!updateResult.rows[0]) {
        console.error('Erreur lors de la mise à jour de la photo dans la base de données');
        throw new Error('Erreur lors de la mise à jour de la photo');
      }

      console.log('Photo mise à jour avec succès dans la base de données');

      // Récupérer les informations mises à jour
      const updatedUser = await pool.query(
        'SELECT id, username, email, nom, prenom, date_naissance, ville, photo FROM users WHERE id = $1',
        [socket.userId]
      );
      
      if (!updatedUser.rows[0]) {
        console.error('Erreur lors de la récupération des informations mises à jour');
        throw new Error('Erreur lors de la récupération des informations mises à jour');
      }

      console.log('Informations utilisateur récupérées avec succès');

      // Émettre l'événement de succès
      socket.emit('photoUpdateSuccess', {
        photo: updatedUser.rows[0].photo
      });

      // Émettre également un événement userUpdateSuccess pour mettre à jour le store
      socket.emit('userUpdateSuccess', updatedUser.rows[0]);

      console.log('Événements de mise à jour envoyés au client');

    } catch (err) {
      console.error('Erreur lors de la mise à jour de la photo:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // Gérer les demandes de dépôt
  socket.on('requestDeposit', async (data) => {
    try {
      if (!socket.userId) {
        console.error('Tentative de dépôt sans authentification');
        throw new Error('Non authentifié');
      }

      // Validation du montant
      if (!data.amount || isNaN(data.amount)) {
        throw new Error('Montant invalide');
      }

      const amount = parseFloat(data.amount);
      
      // Vérifier que le montant est positif
      if (amount <= 0) {
        throw new Error('Le montant du dépôt doit être supérieur à 0');
      }

      // Vérifier que le montant n'est pas trop grand (par exemple, limite de 1 million)
      if (amount > 1000000) {
        throw new Error('Le montant du dépôt ne peut pas dépasser 1 000 000');
      }

      console.log('Demande de dépôt reçue:', { userId: socket.userId, amount: amount });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Récupérer le wallet de l'utilisateur
        const walletResult = await client.query(
          'SELECT * FROM wallets WHERE user_id = $1',
          [socket.userId]
        );

        if (walletResult.rows.length === 0) {
          throw new Error('Portefeuille non trouvé');
        }

        const wallet = walletResult.rows[0];

        // Créer la transaction en attente
        await client.query(
          'INSERT INTO transactions (wallet_id, type, amount, status) VALUES ($1, $2, $3, $4)',
          [wallet.id, 'DEPOSIT', amount, 'PENDING']
        );

        await client.query('COMMIT');

        // Envoyer une réponse de succès
        socket.emit('depositResponse', {
          success: true,
          message: 'Demande de dépôt envoyée pour approbation'
        });

        // Récupérer et envoyer les transactions mises à jour
        const updatedTransactions = await pool.query(`
          SELECT * FROM transactions 
          WHERE wallet_id = $1 
          ORDER BY created_at DESC LIMIT 50
        `, [wallet.id]);

        // Envoyer les mises à jour
        socket.emit('transactionsUpdate', updatedTransactions.rows);

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erreur lors de la demande de dépôt:', error);
      socket.emit('depositResponse', {
        success: false,
        message: error.message
      });
    }
  });

  // Gérer les demandes de retrait
  socket.on('requestWithdrawal', async (data) => {
    try {
      if (!socket.userId) {
        console.error('Tentative de retrait sans authentification');
        throw new Error('Non authentifié');
      }

      // Validation du montant
      if (!data.amount || isNaN(data.amount)) {
        throw new Error('Montant invalide');
      }

      const amount = parseFloat(data.amount);
      
      // Vérifier que le montant est positif
      if (amount <= 0) {
        throw new Error('Le montant du retrait doit être supérieur à 0');
      }

      // Vérifier que le montant n'est pas trop grand (par exemple, limite de 1 million)
      if (amount > 1000000) {
        throw new Error('Le montant du retrait ne peut pas dépasser 1 000 000');
      }

      console.log('Demande de retrait reçue:', { userId: socket.userId, amount: amount });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Récupérer le wallet de l'utilisateur
        const walletResult = await client.query(
          'SELECT * FROM wallets WHERE user_id = $1',
          [socket.userId]
        );

        if (walletResult.rows.length === 0) {
          throw new Error('Portefeuille non trouvé');
        }

        const wallet = walletResult.rows[0];

        // Vérifier le solde disponible
        if (parseFloat(wallet.balance) < amount) {
          throw new Error(`Solde insuffisant. Votre solde actuel est de ${wallet.balance}`);
        }

        // Créer la transaction en attente
        await client.query(
          'INSERT INTO transactions (wallet_id, type, amount, status) VALUES ($1, $2, $3, $4)',
          [wallet.id, 'WITHDRAWAL', amount, 'PENDING']
        );

        await client.query('COMMIT');

        // Envoyer une réponse de succès
        socket.emit('withdrawalResponse', {
          success: true,
          message: 'Demande de retrait envoyée pour approbation'
        });

        // Récupérer et envoyer les transactions mises à jour
        const updatedTransactions = await pool.query(`
          SELECT * FROM transactions 
          WHERE wallet_id = $1 
          ORDER BY created_at DESC LIMIT 50
        `, [wallet.id]);

        // Envoyer les mises à jour
        socket.emit('transactionsUpdate', updatedTransactions.rows);

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erreur lors de la demande de retrait:', error);
      socket.emit('withdrawalResponse', {
        success: false,
        message: error.message
      });
    }
  });

  // Gérer les demandes de données
  socket.on('getWallet', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }
      const result = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [socket.userId]);
      socket.emit('walletUpdate', result.rows[0] || { balance: 0 });
    } catch (error) {
      console.error('Erreur lors de la récupération du wallet:', error);
    }
  });

  socket.on('getPositions', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }
      const result = await pool.query(
        `SELECT p.*, c.symbol, c.name 
         FROM portfolio_positions p 
         JOIN cryptocurrencies c ON p.crypto_id = c.id 
         WHERE p.wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)`,
        [socket.userId]
      );
      socket.emit('positionsUpdate', result.rows || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des positions:', error);
    }
  });

  socket.on('getTransactions', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }
      const result = await pool.query(
        `SELECT * FROM transactions 
         WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)
         ORDER BY created_at DESC LIMIT 50`,
        [socket.userId]
      );
      socket.emit('transactionsUpdate', result.rows || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    }
  });

  // Gestion des commissions
  socket.on('getCommissions', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }
      const result = await pool.query('SELECT * FROM commission_settings ORDER BY created_at DESC LIMIT 1');
      const commissions = result.rows[0] || { buy_commission: 2.5, sell_commission: 2.5 };
      socket.emit('commissionsUpdate', {
        buyCommission: commissions.buy_commission,
        sellCommission: commissions.sell_commission
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des commissions:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('updateCommissions', async (data) => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      // Vérifier si l'utilisateur est admin
      const adminResult = await pool.query(`
        SELECT u.* FROM users u
        JOIN users_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1 AND r.name = 'admin'
      `, [socket.userId]);

      if (adminResult.rows.length === 0) {
        throw new Error('Accès non autorisé');
      }

      // Insérer les nouvelles commissions
      await pool.query(
        'INSERT INTO commission_settings (buy_commission, sell_commission, updated_by) VALUES ($1, $2, $3)',
        [data.buyCommission, data.sellCommission, socket.userId]
      );

      // Émettre la mise à jour à tous les clients
      io.emit('commissionsUpdate', {
        buyCommission: data.buyCommission,
        sellCommission: data.sellCommission
      });

      socket.emit('success', { message: 'Commissions mises à jour avec succès' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des commissions:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Gérer les transactions de crypto
  socket.on('tradeCrypto', async (data) => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const { type, symbol, amount, price } = data;
      // S'assurer que les valeurs sont des nombres
      const parsedAmount = parseFloat(amount);
      const parsedPrice = parseFloat(price);
      const totalPrice = parsedAmount * parsedPrice;

      if (isNaN(parsedAmount) || isNaN(parsedPrice) || isNaN(totalPrice)) {
        throw new Error('Valeurs numériques invalides');
      }

      console.log('Demande de transaction crypto reçue:', { 
        userId: socket.userId, 
        type, 
        symbol, 
        amount: parsedAmount, 
        price: parsedPrice,
        totalPrice 
      });

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Récupérer le wallet et la crypto
        const [walletResult, cryptoResult] = await Promise.all([
          client.query('SELECT * FROM wallets WHERE user_id = $1', [socket.userId]),
          client.query('SELECT * FROM cryptocurrencies WHERE symbol = $1', [symbol])
        ]);

        if (walletResult.rows.length === 0) {
          throw new Error('Portefeuille non trouvé');
        }
        if (cryptoResult.rows.length === 0) {
          throw new Error('Cryptomonnaie non trouvée');
        }

        const wallet = walletResult.rows[0];
        const crypto = cryptoResult.rows[0];

        // Récupérer les commissions actuelles
        const commissionsResult = await client.query('SELECT * FROM commission_settings ORDER BY created_at DESC LIMIT 1');
        const commission = commissionsResult.rows[0] || { buy_commission: 2.5, sell_commission: 2.5 };
        
        // Calculer le montant de la commission
        const commissionRate = type === 'buy' ? commission.buy_commission : commission.sell_commission;
        const feeAmount = (totalPrice * commissionRate) / 100;

        // Vérifier la position existante
        const positionResult = await client.query(
          'SELECT * FROM portfolio_positions WHERE wallet_id = $1 AND crypto_id = $2',
          [wallet.id, crypto.id]
        );
        const existingPosition = positionResult.rows[0];

        if (type === 'buy') {
          // Vérifier le solde pour l'achat (incluant la commission)
          const totalWithFee = totalPrice + feeAmount;
          if (parseFloat(wallet.balance) < totalWithFee) {
            throw new Error(`Solde insuffisant. Vous avez ${wallet.balance} USD, l'achat nécessite ${totalWithFee.toFixed(2)} USD (dont ${feeAmount.toFixed(2)} USD de commission)`);
          }

          // Mettre à jour le solde du wallet
          await client.query(
            'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
            [totalWithFee, wallet.id]
          );

          // Mettre à jour ou créer la position
          if (existingPosition) {
            const totalQuantity = parseFloat(existingPosition.quantity) + parsedAmount;
            const newTotalInvested = parseFloat(existingPosition.total_invested) + totalPrice;
            const newAveragePrice = newTotalInvested / totalQuantity;

            await client.query(
              'UPDATE portfolio_positions SET quantity = $1, average_buy_price = $2, total_invested = $3 WHERE id = $4',
              [totalQuantity.toFixed(8), newAveragePrice.toFixed(8), newTotalInvested.toFixed(8), existingPosition.id]
            );
          } else {
            await client.query(
              'INSERT INTO portfolio_positions (wallet_id, crypto_id, quantity, average_buy_price, total_invested) VALUES ($1, $2, $3, $4, $5)',
              [wallet.id, crypto.id, parsedAmount.toFixed(8), parsedPrice.toFixed(8), totalPrice.toFixed(8)]
            );
          }
        } else {
          // Vérifier la quantité disponible pour la vente
          if (!existingPosition || parseFloat(existingPosition.quantity) < parsedAmount) {
            throw new Error(`Quantité insuffisante. Vous avez ${existingPosition?.quantity || 0} ${symbol}`);
          }

          // Calculer le montant net après commission
          const netAmount = totalPrice - feeAmount;

          // Mettre à jour le solde du wallet
          await client.query(
            'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
            [netAmount.toFixed(8), wallet.id]
          );

          // Mettre à jour la position
          if (parseFloat(existingPosition.quantity) === parsedAmount) {
            await client.query('DELETE FROM portfolio_positions WHERE id = $1', [existingPosition.id]);
          } else {
            const remainingQuantity = parseFloat(existingPosition.quantity) - parsedAmount;
            const remainingInvested = (parseFloat(existingPosition.total_invested) * remainingQuantity) / parseFloat(existingPosition.quantity);
            
            await client.query(
              'UPDATE portfolio_positions SET quantity = $1, total_invested = $2 WHERE id = $3',
              [remainingQuantity.toFixed(8), remainingInvested.toFixed(8), existingPosition.id]
            );
          }
        }

        // Créer la transaction dans crypto_transactions
        await client.query(
          `INSERT INTO crypto_transactions 
          (user_id, crypto_id, transaction_type, quantity, price_per_unit, total_amount, fee_amount, status) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            socket.userId,
            crypto.id,
            type.toUpperCase(),
            parsedAmount.toFixed(8),
            parsedPrice.toFixed(8),
            totalPrice.toFixed(8),
            feeAmount.toFixed(8),
            'COMPLETED'
          ]
        );

        await client.query('COMMIT');

        // Récupérer les données mises à jour
        const [updatedWallet, updatedPositions, updatedTransactions] = await Promise.all([
          pool.query('SELECT * FROM wallets WHERE id = $1', [wallet.id]),
          pool.query(
            'SELECT p.*, c.symbol, c.name FROM portfolio_positions p JOIN cryptocurrencies c ON p.crypto_id = c.id WHERE p.wallet_id = $1',
            [wallet.id]
          ),
          pool.query(
            `SELECT ct.*, c.symbol, u.username 
             FROM crypto_transactions ct
             JOIN cryptocurrencies c ON ct.crypto_id = c.id
             JOIN users u ON ct.user_id = u.id
             WHERE ct.user_id = $1
             ORDER BY ct.created_at DESC LIMIT 50`,
            [socket.userId]
          )
        ]);

        // Envoyer les mises à jour
        socket.emit('walletUpdate', {
          id: updatedWallet.rows[0].id,
          balance: parseFloat(updatedWallet.rows[0].balance),
          user_id: socket.userId
        });
        socket.emit('positionsUpdate', updatedPositions.rows);
        socket.emit('transactionsUpdate', updatedTransactions.rows);

        socket.emit('tradeResponse', {
          success: true,
          message: `${type === 'buy' ? 'Achat' : 'Vente'} de ${parsedAmount} ${symbol} effectué avec succès`
        });

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erreur lors de la transaction crypto:', error);
      socket.emit('tradeResponse', {
        success: false,
        message: error.message
      });
    }
  });

  socket.on('getAllTransactions', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const result = await pool.query(`
        SELECT ct.*, u.username, c.symbol 
        FROM crypto_transactions ct
        JOIN users u ON ct.user_id = u.id
        JOIN cryptocurrencies c ON ct.crypto_id = c.id
        ORDER BY ct.created_at DESC
      `);

      socket.emit('allTransactionsUpdate', result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('getCryptoList', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const result = await pool.query('SELECT * FROM cryptocurrencies ORDER BY name ASC');
      socket.emit('cryptoListUpdate', result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération de la liste des cryptos:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('performAnalysis', async (data) => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const { type, cryptos, dateMin, dateMax } = data;
      const results = {};

      for (const symbol of cryptos) {
        // Récupérer l'historique des prix pour la période donnée
        const query = `
          SELECT h.price 
          FROM crypto_price_history h
          JOIN cryptocurrencies c ON h.crypto_id = c.id
          WHERE c.symbol = $1 
          AND h.created_at BETWEEN $2 AND $3
          ORDER BY h.created_at ASC
        `;
        
        const result = await pool.query(query, [symbol, dateMin, dateMax]);
        const prices = result.rows.map(row => parseFloat(row.price));

        if (prices.length === 0) {
          results[symbol] = null;
          continue;
        }

        // Calculer la statistique demandée
        let value;
        switch (type) {
          case 'min':
            value = Math.min(...prices);
            break;
          case 'max':
            value = Math.max(...prices);
            break;
          case 'mean':
            value = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            break;
          case 'stddev':
            const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            const squaredDiffs = prices.map(price => Math.pow(price - mean, 2));
            value = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length);
            break;
          case 'quartile1':
            const sortedPrices = [...prices].sort((a, b) => a - b);
            const q1Index = Math.floor(sortedPrices.length * 0.25);
            value = sortedPrices[q1Index];
            break;
          default:
            throw new Error('Type d\'analyse non valide');
        }

        results[symbol] = value;
      }

      socket.emit('analysisResults', results);

    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('getCryptoTransactions', async () => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const result = await pool.query(`
        SELECT ct.*, c.symbol 
        FROM crypto_transactions ct
        JOIN cryptocurrencies c ON ct.crypto_id = c.id
        WHERE ct.user_id = $1
        ORDER BY ct.created_at DESC
      `, [socket.userId]);

      socket.emit('cryptoTransactionsUpdate', result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions crypto:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Analyse des commissions
  socket.on('analyzeCommissions', async (data) => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const { type, crypto, dateMin, dateMax } = data;
      let query = `
        SELECT c.symbol,
               SUM(ct.fee_amount) as total_commission,
               COUNT(*) as transaction_count
        FROM crypto_transactions ct
        JOIN cryptocurrencies c ON ct.crypto_id = c.id
        WHERE ct.created_at BETWEEN $1 AND $2
      `;

      const queryParams = [dateMin, dateMax];

      if (crypto) {
        query += ` AND c.symbol = $3`;
        queryParams.push(crypto);
      }

      query += ` GROUP BY c.symbol`;

      const result = await pool.query(query, queryParams);
      
      const analysisResults = {};
      result.rows.forEach(row => {
        analysisResults[row.symbol] = {
          commission: type === 'average' 
            ? parseFloat(row.total_commission) / row.transaction_count 
            : parseFloat(row.total_commission),
          transactions: parseInt(row.transaction_count)
        };
      });

      socket.emit('commissionAnalysisResults', analysisResults);

    } catch (error) {
      console.error('Erreur lors de l\'analyse des commissions:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('getUserTransactionsSummary', async (data) => {
    try {
      const dateMax = data?.dateMax ? new Date(data.dateMax) : new Date();
      console.log('Date maximale pour la recherche:', dateMax);

      // Requête simplifiée utilisant uniquement crypto_transactions
      const result = await pool.query(`
        SELECT 
          u.username,
          ROUND(COALESCE(SUM(
            CASE 
              WHEN ct.transaction_type = 'BUY' 
              AND ct.created_at <= $1 
              AND ct.status = 'COMPLETED'
              THEN ct.total_amount
              ELSE 0 
            END
          ), 0)::numeric, 2) as "totalBuy",
          
          ROUND(COALESCE(SUM(
            CASE 
              WHEN ct.transaction_type = 'SELL' 
              AND ct.created_at <= $1 
              AND ct.status = 'COMPLETED'
              THEN ct.total_amount
              ELSE 0 
            END
          ), 0)::numeric, 2) as "totalSell",
          
          ROUND(COALESCE(SUM(
            CASE 
              WHEN ct.created_at <= $1 
              AND ct.status = 'COMPLETED'
              THEN
                CASE 
                  WHEN ct.transaction_type = 'BUY' THEN ct.quantity * ct.price_per_unit
                  WHEN ct.transaction_type = 'SELL' THEN -ct.quantity * ct.price_per_unit
                  ELSE 0
                END
              ELSE 0
            END
          ), 0)::numeric, 2) as "portfolioValue"
        FROM users u
        LEFT JOIN crypto_transactions ct ON u.id = ct.user_id
        WHERE NOT EXISTS (
          SELECT 1 FROM users_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND r.name = 'admin'
        )
        GROUP BY u.username
        ORDER BY u.username;
      `, [dateMax]);

      console.log('Résultats de la requête:', result.rows);
      socket.emit('userTransactionsSummary', result.rows);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération des données' });
    }
  });

  // Gestion des notifications
  socket.on('getNotifications', async () => {
    try {
      if (!socket.userId) {
        console.error('Tentative de récupération des notifications sans authentification');
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      console.log('Récupération des notifications pour l\'utilisateur:', socket.userId);

      const result = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
        [socket.userId]
      );

      console.log('Notifications trouvées:', result.rows.length);
      
      // S'assurer que les dates sont bien formatées
      const formattedNotifications = result.rows.map(notification => ({
        ...notification,
        created_at: notification.created_at.toISOString()
      }));

      socket.emit('notificationsUpdate', formattedNotifications);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération des notifications' });
    }
  });

  // Gestion des informations utilisateur
  socket.on('getUserInfo', async (data) => {
    try {
      if (!socket.userId) {
        console.error('Tentative de récupération des informations utilisateur sans authentification');
        socket.emit('error', { message: 'Non authentifié' });
        return;
      }

      console.log('Récupération des informations pour l\'utilisateur:', socket.userId);

      const result = await pool.query(
        'SELECT id, username, email, nom, prenom, date_naissance, ville FROM users WHERE id = $1',
        [socket.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      const user = result.rows[0];
      
      // Formater la date de naissance si elle existe
      if (user.date_naissance) {
        user.date_naissance = user.date_naissance.toISOString().split('T')[0];
      }

      console.log('Informations utilisateur trouvées:', user);
      socket.emit('userInfo', user);
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération des informations utilisateur' });
    }
  });

  socket.on('updateUserField', async (data) => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      const { field, value, password } = data;
      
      if (!field || value === undefined || !password) {
        throw new Error('Données invalides');
      }

      // Vérifier le mot de passe
      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [socket.userId]);
      if (userResult.rows.length === 0) {
        throw new Error('Utilisateur non trouvé');
      }

      const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!validPassword) {
        throw new Error('Mot de passe incorrect');
      }

      // Liste des champs autorisés à la modification
      const allowedFields = ['username', 'nom', 'prenom', 'date_naissance', 'ville', 'photo'];
      if (!allowedFields.includes(field)) {
        throw new Error('Champ non modifiable');
      }

      // Validation des champs
      switch (field) {
        case 'username':
          if (typeof value !== 'string' || value.length < 3 || value.length > 50) {
            throw new Error('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères');
          }
          // Vérifier si le nom d'utilisateur est déjà pris
          const usernameCheck = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [value, socket.userId]
          );
          if (usernameCheck.rows.length > 0) {
            throw new Error('Ce nom d\'utilisateur est déjà pris');
          }
          break;
        
        case 'nom':
        case 'prenom':
          if (typeof value !== 'string' || value.length < 2 || value.length > 50) {
            throw new Error('Le nom/prénom doit contenir entre 2 et 50 caractères');
          }
          break;
        
        case 'date_naissance':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error('Date de naissance invalide');
          }
          const minDate = new Date();
          minDate.setFullYear(minDate.getFullYear() - 100);
          const maxDate = new Date();
          maxDate.setFullYear(maxDate.getFullYear() - 18);
          if (date < minDate || date > maxDate) {
            throw new Error('La date de naissance doit être comprise entre 18 et 100 ans');
          }
          break;
        
        case 'ville':
          if (typeof value !== 'string' || value.length < 2 || value.length > 100) {
            throw new Error('La ville doit contenir entre 2 et 100 caractères');
          }
          break;

        case 'photo':
          if (typeof value !== 'string' || !value.startsWith('http')) {
            throw new Error('Format de photo invalide - l\'URL doit commencer par http');
          }
          break;
      }

      // Mise à jour du champ
      await pool.query(
        'UPDATE users SET ' + field + ' = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [value, socket.userId]
      );

      // Récupérer les informations mises à jour
      const updatedResult = await pool.query(
        'SELECT id, username, email, nom, prenom, date_naissance, ville, photo FROM users WHERE id = $1',
        [socket.userId]
      );

      const updatedUser = updatedResult.rows[0];
      if (updatedUser.date_naissance) {
        updatedUser.date_naissance = updatedUser.date_naissance.toISOString().split('T')[0];
      }

      console.log('Champ mis à jour avec succès:', { field, userId: socket.userId });
      socket.emit('userUpdateSuccess', updatedUser);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('changePassword', async (data) => {
    try {
      console.log('Réception de la demande de changement de mot de passe');
      
      if (!socket.userId) {
        console.error('Utilisateur non authentifié');
        throw new Error('Non authentifié');
      }
      console.log('Utilisateur authentifié:', socket.userId);

      const { currentPassword, newPassword } = data;
      
      if (!currentPassword || !newPassword) {
        console.error('Données manquantes:', { currentPassword: !!currentPassword, newPassword: !!newPassword });
        throw new Error('Données invalides');
      }
      console.log('Données reçues valides');

      // Vérifier le mot de passe actuel
      const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [socket.userId]);
      if (userResult.rows.length === 0) {
        console.error('Utilisateur non trouvé en base:', socket.userId);
        throw new Error('Utilisateur non trouvé');
      }
      console.log('Utilisateur trouvé en base');

      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!validPassword) {
        console.error('Mot de passe actuel incorrect');
        throw new Error('Mot de passe actuel incorrect');
      }
      console.log('Mot de passe actuel vérifié avec succès');

      // Hasher le nouveau mot de passe
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      console.log('Nouveau mot de passe haché');

      // Mettre à jour le mot de passe dans la base de données
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, socket.userId]
      );
      console.log('Mot de passe mis à jour en base');

      socket.emit('passwordChanged', { message: 'Mot de passe modifié avec succès' });
      console.log('Notification envoyée au client');
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('deleteAccount', async (data) => {
    try {
      if (!socket.userId) {
        throw new Error('Non authentifié');
      }

      if (!data.password) {
        throw new Error('Le mot de passe est requis');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Vérifier le mot de passe
        const userResult = await client.query(
          'SELECT password_hash FROM users WHERE id = $1',
          [socket.userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error('Utilisateur non trouvé');
        }

        const validPassword = await bcrypt.compare(data.password, userResult.rows[0].password_hash);
        if (!validPassword) {
          throw new Error('Mot de passe incorrect');
        }

        // Supprimer les données associées
        await client.query('DELETE FROM crypto_transactions WHERE user_id = $1', [socket.userId]);
        await client.query('DELETE FROM wallets WHERE user_id = $1', [socket.userId]);
        await client.query('DELETE FROM users WHERE id = $1', [socket.userId]);

        await client.query('COMMIT');

        // Envoyer la confirmation de suppression
        socket.emit('accountDeleted');

      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du compte:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté');
  });

  // Gestionnaire pour l'historique des opérations
  socket.on('getOperationsHistory', async (filters) => {
    try {
      console.log('Récupération de l\'historique des opérations avec les filtres:', filters);
      
      let query = `
        SELECT 
          t.id,
          t.quantity,
          t.price_per_unit,
          t.fee_amount as commission_amount,
          t.created_at,
          t.transaction_type as type,
          t.user_id,
          u.username,
          u.photo as user_photo,
          c.symbol as crypto_symbol,
          c.name as crypto_name,
          (t.quantity * t.price_per_unit) as amount
        FROM crypto_transactions t
        JOIN users u ON t.user_id = u.id
        JOIN cryptocurrencies c ON t.crypto_id = c.id
        WHERE 1=1
      `;

      const queryParams = [];

      if (filters.startDate) {
        query += ` AND t.created_at >= $${queryParams.length + 1}`;
        queryParams.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND t.created_at <= $${queryParams.length + 1}`;
        queryParams.push(filters.endDate);
      }

      if (filters.userId) {
        query += ` AND t.user_id = $${queryParams.length + 1}`;
        queryParams.push(filters.userId);
      }

      if (filters.crypto) {
        query += ` AND c.symbol = $${queryParams.length + 1}`;
        queryParams.push(filters.crypto);
      }

      query += ` ORDER BY t.created_at DESC`;

      console.log('Requête SQL:', query);
      console.log('Paramètres:', queryParams);

      const result = await pool.query(query, queryParams);
      console.log(`${result.rows.length} opérations trouvées`);
      
      socket.emit('operationsHistory', result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération de l\'historique' });
    }
  });

  // Gestionnaire pour la liste des utilisateurs
  socket.on('getUsersList', async () => {
    try {
      const query = `
        SELECT 
          u.id,
          u.username,
          u.photo,
          COUNT(DISTINCT ct.id) as operations_count
        FROM users u
        LEFT JOIN crypto_transactions ct ON u.id = ct.user_id
        WHERE NOT EXISTS (
          SELECT 1 FROM users_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id AND r.name = 'admin'
        )
        GROUP BY u.id, u.username, u.photo
        ORDER BY u.username
      `;
      
      const result = await pool.query(query);
      console.log(`${result.rows.length} utilisateurs trouvés`);
      
      socket.emit('usersList', result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération des utilisateurs' });
    }
  });

  // Gestionnaire pour la liste des cryptos
  socket.on('getCryptosList', async () => {
    try {
      const query = `
        SELECT id, symbol, name
        FROM cryptocurrencies
        ORDER BY name
      `;
      
      const result = await pool.query(query);
      console.log(`${result.rows.length} cryptomonnaies trouvées`);
      
      socket.emit('cryptosList', result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération des cryptomonnaies:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération des cryptomonnaies' });
    }
  });
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const walletRoutes = require('./routes/wallet');
const transactionRoutes = require('./routes/transactions');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
// Remove authentication for wallet routes
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  // Lancer une première mise à jour immédiate
  updatePrices();
});
