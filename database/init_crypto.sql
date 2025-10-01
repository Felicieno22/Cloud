-- Supprimer les données existantes
DELETE FROM price_history;
DELETE FROM cryptocurrencies;

-- Insérer les cryptomonnaies avec leurs prix initiaux
INSERT INTO cryptocurrencies (symbol, name, current_price) VALUES
('BTC', 'Bitcoin', 45000.00),
('ETH', 'Ethereum', 3000.00),
('XRP', 'Ripple', 1.20),
('DOGE', 'Dogecoin', 0.15),
('ADA', 'Cardano', 2.50);

-- Insérer les prix initiaux dans l'historique
INSERT INTO price_history (symbol, price, timestamp)
SELECT symbol, current_price, CURRENT_TIMESTAMP
FROM cryptocurrencies;
