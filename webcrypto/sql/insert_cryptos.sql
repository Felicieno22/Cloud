-- Insertion des cryptomonnaies
INSERT INTO cryptocurrencies (coin_id, symbol, name, current_price, market_cap, price_change_24h, last_updated, price_history)
VALUES 
('bitcoin', 'BTC', 'Bitcoin', 45000.00, 850000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('ethereum', 'ETH', 'Ethereum', 3000.00, 350000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('binancecoin', 'BNB', 'Binance Coin', 400.00, 65000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('ripple', 'XRP', 'Ripple', 1.20, 55000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('solana', 'SOL', 'Solana', 100.00, 35000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('cardano', 'ADA', 'Cardano', 2.50, 80000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('dogecoin', 'DOGE', 'Dogecoin', 0.15, 20000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('polkadot', 'DOT', 'Polkadot', 25.00, 25000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('polygon', 'MATIC', 'Polygon', 2.00, 15000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb),
('chainlink', 'LINK', 'Chainlink', 15.00, 7000000000, 0.00, CURRENT_TIMESTAMP, '[]'::jsonb);
