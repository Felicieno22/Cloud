-- Insertion des cryptomonnaies dans la table crypto
INSERT INTO crypto (name, symbol, initial_price, prix) VALUES
('Bitcoin', 'BTC', 45000.00, 45000.00),
('Ethereum', 'ETH', 3200.00, 3200.00),
('Litecoin', 'LTC', 150.00, 150.00),
('Ripple', 'XRP', 1.20, 1.20),
('Cardano', 'ADA', 2.50, 2.50)
ON CONFLICT (symbol) DO NOTHING;

-- Insertion des prix initiaux
INSERT INTO cryptocurrency_prices (crypto_id, current_price, timestamp) 
SELECT idCrypto, prix, CURRENT_TIMESTAMP 
FROM crypto;

-- Suppression de l'utilisateur de test s'il existe déjà
DELETE FROM users WHERE email = 'test@example.com';

-- Création d'un utilisateur de test avec le hash correct
INSERT INTO users (nom, prenom, email, date_naissance, ville, password_hash, created_at, updated_at) VALUES
('Utilisateur', 'Test', 'test@example.com', '1990-01-01', 'Antananarivo', 
'$2b$10$O5q/HGkfu21VyznKurbUl.lz6M.uGB3THYNbtFIiIgsd7BTKlnr4u', 
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Création de la sécurité utilisateur
INSERT INTO user_security (user_id, is_email_verified) VALUES
((SELECT id FROM users WHERE email = 'test@example.com'), true);

-- Création du portefeuille pour l'utilisateur de test
INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES
((SELECT id FROM users WHERE email = 'test@example.com'), 10000.00, 
CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Ajout de quelques holdings
INSERT INTO crypto_holdings (wallet_id, idCrypto, amount, created_at, updated_at) 
SELECT 
    w.id as wallet_id,
    c.idCrypto,
    CASE c.symbol 
        WHEN 'BTC' THEN 0.5
        WHEN 'ETH' THEN 2.0
        WHEN 'LTC' THEN 10.0
    END as amount,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM wallets w
CROSS JOIN crypto c
WHERE w.user_id = (SELECT id FROM users WHERE email = 'test@example.com')
AND c.symbol IN ('BTC', 'ETH', 'LTC');

-- Ajout de quelques transactions
INSERT INTO crypto_transactions (buyer_wallet_id, seller_wallet_id, crypto_id, amount, price_per_unit, total_price, created_at)
WITH user_wallet AS (
    SELECT id FROM wallets WHERE user_id = (SELECT id FROM users WHERE email = 'test@example.com') LIMIT 1
)
SELECT 
    uw.id as buyer_wallet_id,
    uw.id as seller_wallet_id,
    c.idCrypto as crypto_id,
    CASE c.symbol 
        WHEN 'BTC' THEN 0.5
        WHEN 'ETH' THEN 2.0
        WHEN 'LTC' THEN 10.0
    END as amount,
    CASE c.symbol 
        WHEN 'BTC' THEN 44000.00
        WHEN 'ETH' THEN 3100.00
        WHEN 'LTC' THEN 145.00
    END as price_per_unit,
    CASE c.symbol 
        WHEN 'BTC' THEN 22000.00
        WHEN 'ETH' THEN 6200.00
        WHEN 'LTC' THEN 1450.00
    END as total_price,
    CASE c.symbol 
        WHEN 'BTC' THEN CURRENT_TIMESTAMP - INTERVAL '2 days'
        WHEN 'ETH' THEN CURRENT_TIMESTAMP - INTERVAL '1 day'
        WHEN 'LTC' THEN CURRENT_TIMESTAMP - INTERVAL '12 hours'
    END as created_at
FROM user_wallet uw
CROSS JOIN crypto c
WHERE c.symbol IN ('BTC', 'ETH', 'LTC');

-- Ajout de quelques dépôts internationaux
INSERT INTO deposits (user_id, amount, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1),
 5000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '3 days'),
((SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1),
 25000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- Ajout de quelques retraits internationaux
INSERT INTO withdrawals (user_id, amount, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'test@example.com' LIMIT 1),
 1000.00, 'completed', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Ajout de quelques dépôts locaux
INSERT INTO depot (idUser, idCrypto, montant, dateDepot)
SELECT 
    u.id,
    c.idCrypto,
    CASE c.symbol
        WHEN 'BTC' THEN 0.1
        WHEN 'ETH' THEN 1.0
        WHEN 'LTC' THEN 5.0
    END,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM users u
CROSS JOIN crypto c
WHERE u.email = 'test@example.com'
AND c.symbol IN ('BTC', 'ETH', 'LTC');

-- Ajout de quelques retraits locaux
INSERT INTO retrait (idUser, idCrypto, montant, dateRetrait)
SELECT 
    u.id,
    c.idCrypto,
    CASE c.symbol
        WHEN 'BTC' THEN 0.05
        WHEN 'ETH' THEN 0.5
        WHEN 'LTC' THEN 2.0
    END,
    CURRENT_TIMESTAMP - INTERVAL '12 hours'
FROM users u
CROSS JOIN crypto c
WHERE u.email = 'test@example.com'
AND c.symbol IN ('BTC', 'ETH', 'LTC');

-- Ajout de quelques achats/ventes
INSERT INTO achatVente (idUserProprio, idUserAcheteur, idCrypto, montant, dateAchatVente)
SELECT 
    u1.id as idUserProprio,
    u1.id as idUserAcheteur,
    c.idCrypto,
    CASE c.symbol
        WHEN 'BTC' THEN 0.2
        WHEN 'ETH' THEN 1.5
        WHEN 'LTC' THEN 7.0
    END,
    CURRENT_TIMESTAMP - INTERVAL '6 hours'
FROM users u1
CROSS JOIN crypto c
WHERE u1.email = 'test@example.com'
AND c.symbol IN ('BTC', 'ETH', 'LTC');

-- Insérer des cryptomonnaies de test
INSERT INTO cryptocurrencies (symbol, name, current_price) VALUES
('BTC', 'Bitcoin', 45000.00),
('ETH', 'Ethereum', 2500.00),
('BNB', 'Binance Coin', 300.00),
('ADA', 'Cardano', 1.20),
('SOL', 'Solana', 100.00)
ON CONFLICT (symbol) DO UPDATE 
SET current_price = EXCLUDED.current_price,
    last_updated = CURRENT_TIMESTAMP;

-- Insérer des données historiques de prix
INSERT INTO price_history (symbol, price, timestamp)
SELECT 
    c.symbol,
    c.current_price * (1 + (random() * 0.1 - 0.05)),
    CURRENT_TIMESTAMP - (interval '1 hour') + (interval '1 minute' * generate_series(0, 59))
FROM cryptocurrencies c;

-- Informations de connexion pour l'utilisateur de test :
-- Email : test@example.com
-- Mot de passe : TestUser123
