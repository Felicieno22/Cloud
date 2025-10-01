-- Suppression des tables si elles existent
DROP TABLE IF EXISTS achatVente CASCADE;
DROP TABLE IF EXISTS retrait CASCADE;
DROP TABLE IF EXISTS depot CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS crypto_transactions CASCADE;
DROP TABLE IF EXISTS crypto_holdings CASCADE;
DROP TABLE IF EXISTS cryptocurrency_prices CASCADE;
DROP TABLE IF EXISTS crypto CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS mfa_tokens CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_security CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS crypto_User CASCADE;
DROP VIEW IF EXISTS user_portfolio CASCADE;
DROP VIEW IF EXISTS crypto_price_changes CASCADE;
DROP VIEW IF EXISTS achatvente_history CASCADE;

-- Suppression des tables si elles existent
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS crypto_wallets CASCADE;
DROP TABLE IF EXISTS wallet_operations CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS cryptocurrencies CASCADE;

-- Table des utilisateurs
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    date_naissance DATE NOT NULL,
    ville VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    balance DECIMAL(20, 2) DEFAULT 0,
    CONSTRAINT prevent_email_update CHECK (email = email)
);

-- Table de sécurité des utilisateurs
CREATE TABLE user_security (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expiry TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    last_failed_login TIMESTAMP,
    account_locked BOOLEAN DEFAULT FALSE,
    account_locked_until TIMESTAMP,
    mfa_token VARCHAR(6),
    mfa_token_expiry TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des sessions
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des tokens MFA
CREATE TABLE mfa_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des cryptomonnaies
CREATE TABLE cryptocurrencies (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_price DECIMAL(20, 8) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de l'historique des prix
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) REFERENCES cryptocurrencies(symbol),
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_price_timestamp UNIQUE (symbol, timestamp)
);

-- Table des portefeuilles crypto
CREATE TABLE crypto_wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    symbol VARCHAR(10) REFERENCES cryptocurrencies(symbol),
    balance DECIMAL(20, 8) DEFAULT 0,
    CONSTRAINT unique_user_crypto UNIQUE (user_id, symbol)
);

-- Table des opérations sur le portefeuille
CREATE TABLE wallet_operations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('deposit', 'withdrawal')),
    amount DECIMAL(20, 2) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    expiry_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Table des transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    symbol VARCHAR(10) REFERENCES cryptocurrencies(symbol),
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    amount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    total_value DECIMAL(20, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des dépôts internationaux
CREATE TABLE deposits (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    validation_token VARCHAR(255),
    validated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des retraits internationaux
CREATE TABLE withdrawals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    validation_token VARCHAR(255),
    validated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison crypto-utilisateur
CREATE TABLE crypto_User (
    idUser BIGSERIAL PRIMARY KEY,
    idCrypto VARCHAR(10) NOT NULL,
    FOREIGN KEY (idUser) REFERENCES users(id),
    FOREIGN KEY (idCrypto) REFERENCES cryptocurrencies(symbol)
);

-- Table des dépôts locaux
CREATE TABLE depot (
    idDepot BIGSERIAL PRIMARY KEY,
    idUser BIGINT NOT NULL,
    idCrypto VARCHAR(10) NOT NULL,
    montant DOUBLE PRECISION NOT NULL,
    dateDepot TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUser) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (idCrypto) REFERENCES cryptocurrencies(symbol) ON DELETE CASCADE
);

-- Table des retraits locaux
CREATE TABLE retrait (
    idRetrait BIGSERIAL PRIMARY KEY,
    idUser BIGINT NOT NULL,
    idCrypto VARCHAR(10) NOT NULL,
    montant DOUBLE PRECISION NOT NULL,
    dateRetrait TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUser) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (idCrypto) REFERENCES cryptocurrencies(symbol) ON DELETE CASCADE
);

-- Table des achats/ventes
CREATE TABLE achatVente (
    idAchatVente BIGSERIAL PRIMARY KEY,
    idUserProprio BIGINT NOT NULL,
    idUserAcheteur BIGINT NOT NULL,
    idCrypto VARCHAR(10) NOT NULL,
    montant DOUBLE PRECISION NOT NULL,
    dateAchatVente TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idUserProprio) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (idUserAcheteur) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (idCrypto) REFERENCES cryptocurrencies(symbol) ON DELETE CASCADE
);

-- Vue du portefeuille utilisateur
CREATE VIEW user_portfolio AS
SELECT
    u.id AS user_id,
    u.nom AS user_nom,
    u.prenom AS user_prenom,
    c.symbol AS crypto_id,
    c.name AS crypto_nom,
    COALESCE(SUM(d.montant), 0) - COALESCE(SUM(r.montant), 0) AS balance
FROM
    users u
LEFT JOIN
    depot d ON u.id = d.idUser
LEFT JOIN
    retrait r ON u.id = r.idUser
LEFT JOIN
    cryptocurrencies c ON c.symbol = d.idCrypto
GROUP BY
    u.id, u.nom, u.prenom, c.symbol, c.name;

-- Vue des changements de prix des cryptomonnaies
CREATE VIEW crypto_price_changes AS
SELECT
    c.symbol,
    c.name AS crypto_nom,
    c.current_price AS old_price,
    new_c.current_price AS new_price,
    c.last_updated AS old_timestamp,
    new_c.last_updated AS new_timestamp
FROM
    cryptocurrencies c
JOIN
    cryptocurrencies new_c ON c.symbol = new_c.symbol
WHERE
    c.last_updated < new_c.last_updated
    AND new_c.last_updated - c.last_updated BETWEEN INTERVAL '2 seconds' AND INTERVAL '10 seconds'
    AND c.last_updated BETWEEN '2024-10-10' AND '2024-12-20';

-- Vue de l'historique des achats/ventes
CREATE VIEW achatvente_history AS
SELECT
    av.idAchatVente,
    av.idUserProprio,
    u1.nom AS proprio_nom,
    u1.prenom AS proprio_prenom,
    av.idUserAcheteur,
    u2.nom AS acheteur_nom,
    u2.prenom AS acheteur_prenom,
    av.idCrypto,
    c.name AS nomCrypto,
    av.montant,
    av.dateAchatVente
FROM
    achatVente av
JOIN
    users u1 ON av.idUserProprio = u1.id
JOIN
    users u2 ON av.idUserAcheteur = u2.id
JOIN
    cryptocurrencies c ON av.idCrypto = c.symbol;

-- Ajout de la table deposit_requests
CREATE TABLE IF NOT EXISTS deposit_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    expiry_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les transactions en attente
CREATE TABLE pending_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('deposit', 'withdraw')),
    symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    verification_token VARCHAR(64) NOT NULL,
    verification_expiry TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired'))
);

-- Index pour améliorer les performances
CREATE INDEX idx_price_history_symbol_timestamp ON price_history(symbol, timestamp DESC);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_crypto_wallets_user_id ON crypto_wallets(user_id);
CREATE INDEX idx_wallet_operations_user_id ON wallet_operations(user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_mfa_tokens_user_id ON mfa_tokens(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_security_user_id ON user_security(user_id);
CREATE INDEX idx_crypto_prices_crypto_id ON cryptocurrency_prices(crypto_id);
CREATE INDEX idx_crypto_prices_timestamp ON cryptocurrency_prices(timestamp);
CREATE INDEX idx_crypto_holdings_wallet ON crypto_holdings(wallet_id);
CREATE INDEX idx_crypto_transactions_buyer ON crypto_transactions(buyer_wallet_id);
CREATE INDEX idx_crypto_transactions_seller ON crypto_transactions(seller_wallet_id);
CREATE INDEX idx_deposits_user ON deposits(user_id);
CREATE INDEX idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX idx_depot_user ON depot(idUser);
CREATE INDEX idx_retrait_user ON retrait(idUser);
CREATE INDEX idx_achatvente_proprio ON achatVente(idUserProprio);
CREATE INDEX idx_achatvente_acheteur ON achatVente(idUserAcheteur);
