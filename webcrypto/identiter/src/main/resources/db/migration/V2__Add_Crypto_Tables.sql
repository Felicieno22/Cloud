-- Types énumérés
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE alert_condition AS ENUM ('ABOVE', 'BELOW');

-- Table des portefeuilles
CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    balance NUMERIC(20, 8) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- Table des cryptomonnaies suivies
CREATE TABLE cryptocurrencies (
    id BIGSERIAL PRIMARY KEY,
    coin_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    current_price NUMERIC(20, 8),
    market_cap NUMERIC(30, 2),
    price_change_24h NUMERIC(10, 2),
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_coin_id UNIQUE (coin_id)
);

-- Table des positions (crypto détenues par les utilisateurs)
CREATE TABLE portfolio_positions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL,
    crypto_id BIGINT NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    average_buy_price NUMERIC(20, 8) NOT NULL,
    total_invested NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id),
    CONSTRAINT unique_wallet_crypto UNIQUE (wallet_id, crypto_id)
);

-- Table des transactions
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL,
    crypto_id BIGINT,
    type transaction_type NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8),
    price NUMERIC(20, 8),
    status transaction_status NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id)
);

-- Table des favoris
CREATE TABLE favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    crypto_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id),
    CONSTRAINT unique_user_crypto_favorite UNIQUE (user_id, crypto_id)
);

-- Table des alertes de prix
CREATE TABLE price_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    crypto_id BIGINT NOT NULL,
    target_price NUMERIC(20, 8) NOT NULL,
    condition_type alert_condition NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_triggered BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id)
);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour la mise à jour automatique des timestamps
CREATE TRIGGER update_wallet_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_position_updated_at
    BEFORE UPDATE ON portfolio_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction et trigger pour créer automatiquement un portefeuille
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0.00);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_wallet_after_user_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_new_user();

-- Index pour améliorer les performances
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_transactions_crypto ON transactions(crypto_id);
CREATE INDEX idx_positions_wallet ON portfolio_positions(wallet_id);
CREATE INDEX idx_positions_crypto ON portfolio_positions(crypto_id);
CREATE INDEX idx_cryptocurrencies_symbol ON cryptocurrencies(symbol);
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_crypto ON price_alerts(crypto_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);

CREATE TABLE crypto_price_history (
    id SERIAL PRIMARY KEY,
    crypto_id INTEGER REFERENCES cryptocurrencies(id),
    price DECIMAL(20, 8) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(crypto_id, timestamp)
);

CREATE INDEX idx_crypto_price_history_crypto_id_timestamp 
ON crypto_price_history(crypto_id, timestamp);