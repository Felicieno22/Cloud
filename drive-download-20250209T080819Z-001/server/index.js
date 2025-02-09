const express = require('express');
const cors = require('cors');
const cryptoRoutes = require('./routes/crypto');
const walletRoutes = require('./routes/wallet');
const transactionsRoutes = require('./routes/transactions');
const portfolioRoutes = require('./routes/portfolio');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Endpoints existants
app.use('/api/crypto', cryptoRoutes);

// Nouveaux endpoints pour gestion des transactions et portefeuille
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/portfolio', portfolioRoutes);

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});