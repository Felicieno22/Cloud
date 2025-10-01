const pool = require('../db');

class CryptoPriceGenerator {
    constructor() {
        this.priceRanges = {
            'BTC': { min: 35000, max: 45000, volatility: 0.02 },
            'ETH': { min: 2000, max: 2500, volatility: 0.03 },
            'BNB': { min: 200, max: 300, volatility: 0.04 },
            'XRP': { min: 0.5, max: 0.7, volatility: 0.05 },
            'SOL': { min: 80, max: 120, volatility: 0.06 }
        };
    }

    // Générer un nouveau prix basé sur le dernier prix
    generateNewPrice(currentPrice, range) {
        const volatilityFactor = (Math.random() - 0.5) * 2 * range.volatility;
        let newPrice = currentPrice * (1 + volatilityFactor);
        
        // Maintenir le prix dans les limites
        newPrice = Math.max(range.min, Math.min(range.max, newPrice));
        
        return parseFloat(newPrice.toFixed(8));
    }

    // Mettre à jour les prix de toutes les cryptomonnaies
    async updatePrices() {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const [symbol, range] of Object.entries(this.priceRanges)) {
                // Récupérer le prix actuel
                const result = await client.query(
                    'SELECT id, current_price FROM cryptocurrencies WHERE symbol = $1',
                    [symbol]
                );

                if (result.rows.length === 0) {
                    // Créer la cryptomonnaie si elle n'existe pas
                    const initialPrice = (range.min + range.max) / 2;
                    await client.query(
                        'INSERT INTO cryptocurrencies (symbol, name, current_price) VALUES ($1, $2, $3)',
                        [symbol, symbol, initialPrice]
                    );
                    continue;
                }

                const crypto = result.rows[0];
                const newPrice = this.generateNewPrice(crypto.current_price, range);

                // Mettre à jour le prix actuel
                await client.query(
                    'UPDATE cryptocurrencies SET current_price = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2',
                    [newPrice, crypto.id]
                );

                // Enregistrer dans l'historique
                await client.query(
                    'INSERT INTO price_history (crypto_id, price) VALUES ($1, $2)',
                    [crypto.id, newPrice]
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de la mise à jour des prix:', error);
        } finally {
            client.release();
        }
    }

    // Démarrer la mise à jour automatique
    startAutoUpdate(interval = 10000) {
        this.updatePrices();
        this.interval = setInterval(() => this.updatePrices(), interval);
    }

    // Arrêter la mise à jour automatique
    stopAutoUpdate() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }
}

module.exports = new CryptoPriceGenerator();
