-- Insérer les cryptomonnaies initiales
INSERT INTO cryptocurrencies (coin_id, symbol, name, current_price, market_cap, price_change_24h)
VALUES 
    ('bitcoin', 'btc', 'Bitcoin', 42000.00, 800000000000.00, 2.5),
    ('ethereum', 'eth', 'Ethereum', 2200.00, 250000000000.00, 1.8),
    ('binancecoin', 'bnb', 'Binance Coin', 300.00, 50000000000.00, -0.5),
    ('cardano', 'ada', 'Cardano', 0.50, 15000000000.00, 3.2),
    ('solana', 'sol', 'Solana', 100.00, 30000000000.00, 5.1),
    ('ripple', 'xrp', 'XRP', 0.60, 25000000000.00, 1.2),
    ('polkadot', 'dot', 'Polkadot', 15.00, 12000000000.00, 4.3),
    ('dogecoin', 'doge', 'Dogecoin', 0.10, 8000000000.00, -2.1),
    ('avalanche', 'avax', 'Avalanche', 80.00, 20000000000.00, 6.7),
    ('chainlink', 'link', 'Chainlink', 12.00, 5000000000.00, 3.9)
ON CONFLICT (coin_id) DO UPDATE 
SET 
    current_price = EXCLUDED.current_price,
    market_cap = EXCLUDED.market_cap,
    price_change_24h = EXCLUDED.price_change_24h,
    last_updated = CURRENT_TIMESTAMP;
