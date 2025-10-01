const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const pool = require('../db');

// Fonction utilitaire pour calculer les statistiques
const calculateStats = (data, type) => {
    if (!data.length) return null;
    
    switch(type) {
        case 'min':
            return Math.min(...data);
        case 'max':
            return Math.max(...data);
        case 'moyenne':
            return data.reduce((a, b) => a + b) / data.length;
        case 'ecart-type':
            const mean = data.reduce((a, b) => a + b) / data.length;
            const squareDiffs = data.map(value => Math.pow(value - mean, 2));
            return Math.sqrt(squareDiffs.reduce((a, b) => a + b) / data.length);
        case '1er quartile':
            const sorted = [...data].sort((a, b) => a - b);
            return sorted[Math.floor(sorted.length * 0.25)];
        default:
            return null;
    }
};

// Analyse des cryptomonnaies
router.post('/crypto', isAuthenticated, async (req, res) => {
    const { type, crypto, dateMin, dateMax } = req.body;
    
    try {
        let query = `
            SELECT price, timestamp 
            FROM crypto_prices 
            WHERE timestamp BETWEEN $1 AND $2
        `;
        
        const params = [dateMin, dateMax];
        
        if (crypto !== 'Tous') {
            query += ' AND crypto_name = $3';
            params.push(crypto);
        }
        
        const result = await pool.query(query, params);
        const prices = result.rows.map(row => row.price);
        
        const stat = calculateStats(prices, type);
        
        res.json({
            type,
            crypto,
            value: stat,
            dateMin,
            dateMax
        });
    } catch (error) {
        console.error('Erreur analyse crypto:', error);
        res.status(500).json({ error: 'Erreur lors de l\'analyse' });
    }
});

// Analyse des commissions
router.post('/commissions', isAuthenticated, async (req, res) => {
    const { type, crypto, dateMin, dateMax } = req.body;
    
    try {
        let query = `
            SELECT commission_amount 
            FROM transactions 
            WHERE timestamp BETWEEN $1 AND $2
        `;
        
        const params = [dateMin, dateMax];
        
        if (crypto !== 'Tous') {
            query += ' AND crypto_name = $3';
            params.push(crypto);
        }
        
        const result = await pool.query(query, params);
        const commissions = result.rows.map(row => row.commission_amount);
        
        let value;
        if (type === 'Somme') {
            value = commissions.reduce((a, b) => a + b, 0);
        } else if (type === 'Moyenne') {
            value = commissions.reduce((a, b) => a + b, 0) / commissions.length;
        }
        
        res.json({
            type,
            crypto,
            value,
            dateMin,
            dateMax
        });
    } catch (error) {
        console.error('Erreur analyse commissions:', error);
        res.status(500).json({ error: 'Erreur lors de l\'analyse des commissions' });
    }
});

// Mise à jour des taux de commission
router.put('/commission-rates', isAuthenticated, async (req, res) => {
    const { buyRate, sellRate } = req.body;
    
    try {
        await pool.query(
            'UPDATE commission_rates SET buy_rate = $1, sell_rate = $2',
            [buyRate, sellRate]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur mise à jour commissions:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour des taux' });
    }
});

module.exports = router;
