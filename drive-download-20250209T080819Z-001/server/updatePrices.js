const axios = require('axios');
const db = require('./db');
const cron = require('node-cron');

// Liste des cryptos à mettre à jour (les id doivent correspondre à ceux attendus par l’API CoinGecko)
const cryptoList = ['bitcoin', 'ethereum', 'binancecoin', 'ripple', 'solana', 'cardano', 'dogecoin', 'polkadot', 'polygon', 'chainlink'];

async function updateCryptoPrices() {
  try {
    console.log('Mise à jour des prix en cours...');
    // Récupération depuis l'API de CoinGecko
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: cryptoList.join(','),
      }
    });
    const data = response.data;
    
    // Pour chaque crypto, mettre à jour la table
    for (const coin of data) {
      const { id, symbol, name, current_price, market_cap, price_change_24h, last_updated } = coin;
      await db.query(
        `UPDATE cryptocurrencies 
         SET current_price = $1, market_cap = $2, price_change_24h = $3, last_updated = $4 
         WHERE coin_id = $5`,
         [current_price, market_cap, price_change_24h, last_updated, id]
      );
    }
    console.log('Mise à jour terminée.');
  } catch (err) {
    console.error('Erreur lors de la mise à jour des prix :', err.message);
  }
}

// Exécution immédiate
updateCryptoPrices();

// Planification toutes les 10 secondes  
cron.schedule('*/10 * * * * *', updateCryptoPrices);