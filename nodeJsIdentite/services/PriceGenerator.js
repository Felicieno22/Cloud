const pool = require('../db');

class PriceGenerator {
    constructor() {
        this.isRunning = false;
        this.updateInterval = 5000; // 5 secondes
        this.priceVariation = 0.02; // 2% de variation maximum
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('Générateur de prix démarré avec succès');
        this.updatePrices();
    }

    stop() {
        this.isRunning = false;
        console.log('Générateur de prix arrêté');
    }

    async updatePrices() {
        while (this.isRunning) {
            try {
                // Récupérer tous les symboles et prix actuels
                const result = await pool.query('SELECT symbol, current_price FROM cryptocurrencies');
                
                // Mettre à jour chaque prix avec une variation aléatoire
                for (const crypto of result.rows) {
                    const variation = (Math.random() - 0.5) * 2 * this.priceVariation;
                    const newPrice = crypto.current_price * (1 + variation);
                    
                    // Mettre à jour le prix actuel
                    await pool.query(
                        'UPDATE cryptocurrencies SET current_price = $1, last_updated = CURRENT_TIMESTAMP WHERE symbol = $2',
                        [newPrice, crypto.symbol]
                    );

                    // Enregistrer dans l'historique des prix
                    await pool.query(
                        'INSERT INTO price_history (symbol, price) VALUES ($1, $2)',
                        [crypto.symbol, newPrice]
                    );
                }
            } catch (error) {
                console.error('Erreur lors de la mise à jour des prix:', error);
            }

            // Attendre avant la prochaine mise à jour
            await new Promise(resolve => setTimeout(resolve, this.updateInterval));
        }
    }
}

module.exports = new PriceGenerator();
