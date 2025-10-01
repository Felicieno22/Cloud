const pool = require('../db');

class PriceGenerator {
    constructor() {
        this.previousPrices = new Map();
    }

    // Générer un nouveau prix basé sur le prix précédent
    generateNewPrice(currentPrice) {
        // Variation maximale de 2%
        const maxChange = currentPrice * 0.02;
        const change = (Math.random() - 0.5) * 2 * maxChange;
        return Math.max(currentPrice + change, 0.01); // Éviter les prix négatifs
    }

    // Mettre à jour les prix de toutes les cryptos
    async updateAllPrices() {
        try {
            // Récupérer toutes les cryptos
            const result = await pool.query('SELECT idCrypto, nomCrypto, prix FROM crypto');
            
            for (const crypto of result.rows) {
                const newPrice = this.generateNewPrice(crypto.prix);
                
                // Mettre à jour le prix
                await pool.query(
                    'UPDATE crypto SET prix = $1, last_updated = CURRENT_TIMESTAMP WHERE idCrypto = $2',
                    [newPrice, crypto.idCrypto]
                );
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour des prix:', error);
        }
    }
}

module.exports = new PriceGenerator(); 