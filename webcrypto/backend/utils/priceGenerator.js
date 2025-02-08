// Générateur de prix pour les cryptomonnaies
class PriceGenerator {
    constructor() {
        // Tendance du marché (-1 = baissier, 1 = haussier)
        this.marketTrend = 1;
        // Compteur pour changer la tendance
        this.trendCounter = 0;
    }

    // Génère une variation de prix cohérente
    generatePriceChange() {
        // Change la tendance du marché tous les ~50 cycles
        if (this.trendCounter++ > 50) {
            this.marketTrend *= Math.random() > 0.5 ? 1 : -1;
            this.trendCounter = 0;
        }

        // Génère une variation entre -1% et +1%
        const baseChange = (Math.random() * 2 - 1) / 100;
        
        // Applique la tendance du marché
        return baseChange * this.marketTrend;
    }

    // Met à jour le prix d'une crypto
    updatePrice(currentPrice) {
        // Si le prix est 0 ou invalide, retourner un prix par défaut
        if (!currentPrice || currentPrice <= 0) {
            console.error('Prix invalide détecté:', currentPrice);
            return this.getDefaultPrice();
        }

        const change = this.generatePriceChange();
        const newPrice = currentPrice * (1 + change);
        
        // Éviter les prix négatifs ou trop proches de zéro
        return Math.max(newPrice, 0.01);
    }

    // Retourne un prix par défaut basé sur le symbole
    getDefaultPrice() {
        return 100; // Prix par défaut si quelque chose ne va pas
    }
}

module.exports = new PriceGenerator();
