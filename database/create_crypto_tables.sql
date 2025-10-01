-- Table pour stocker les prix actuels des cryptomonnaies
CREATE TABLE IF NOT EXISTS crypto_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    change_24h DECIMAL(10, 2),
    volume_24h DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol)
);

-- Table pour stocker l'historique des prix
CREATE TABLE IF NOT EXISTS crypto_prices_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (symbol) REFERENCES crypto_prices(symbol)
);

-- Insertion des cryptomonnaies initiales
INSERT INTO crypto_prices (symbol, name, price, change_24h, volume_24h, market_cap)
VALUES 
    ('BTC', 'Bitcoin', 45000.00, 2.5, 28000000000, 850000000000),
    ('ETH', 'Ethereum', 3000.00, 1.8, 15000000000, 350000000000),
    ('BNB', 'Binance Coin', 300.00, -0.5, 2000000000, 50000000000),
    ('ADA', 'Cardano', 1.20, 3.2, 1500000000, 40000000000),
    ('SOL', 'Solana', 150.00, 5.7, 3000000000, 45000000000),
    ('DOT', 'Polkadot', 25.00, -1.2, 1000000000, 25000000000),
    ('DOGE', 'Dogecoin', 0.15, 1.5, 800000000, 20000000000),
    ('AVAX', 'Avalanche', 80.00, 4.3, 900000000, 18000000000),
    ('MATIC', 'Polygon', 2.00, 2.8, 700000000, 15000000000),
    ('LINK', 'Chainlink', 15.00, -0.8, 500000000, 7000000000)
ON CONFLICT (symbol) DO UPDATE SET
    price = EXCLUDED.price,
    change_24h = EXCLUDED.change_24h,
    volume_24h = EXCLUDED.volume_24h,
    market_cap = EXCLUDED.market_cap,
    last_updated = CURRENT_TIMESTAMP;
