-- Création de la base de données unique
CREATE DATABASE crypto_db;

\c crypto_db;

-- Table des utilisateurs en attente de vérification
CREATE TABLE pending_users (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    date_naissance DATE NOT NULL,
    ville VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    verification_expiry TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des utilisateurs
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    prenom VARCHAR(50) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    date_naissance DATE NOT NULL,
    ville VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT prevent_email_update CHECK (email = email)
);

-- Table pour les informations de sécurité des utilisateurs
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
    failed_2fa_attempts INTEGER DEFAULT 0,
    last_failed_2fa_login TIMESTAMP,
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

-- Table pour l'authentification multifacteur
CREATE TABLE mfa_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des rôles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison users_roles
CREATE TABLE users_roles (
    user_id BIGINT NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Table des permissions
CREATE TABLE permissions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison roles_permissions
CREATE TABLE roles_permissions (
    role_id INTEGER NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Création des types énumérés
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE alert_condition AS ENUM ('ABOVE', 'BELOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
    CONSTRAINT unique_coin_id UNIQUE (coin_id),
    price_history JSONB DEFAULT '[]' 
);

-- Table des positions
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
    commission_amount NUMERIC(20, 8) DEFAULT 0,
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

-- Table des paramètres de commission
CREATE TABLE commission_settings (
    id SERIAL PRIMARY KEY,
    buy_commission DECIMAL(5,2) NOT NULL CHECK (buy_commission >= 0 AND buy_commission <= 100),
    sell_commission DECIMAL(5,2) NOT NULL CHECK (sell_commission >= 0 AND sell_commission <= 100),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table de l'historique des prix
CREATE TABLE crypto_price_history (
    id SERIAL PRIMARY KEY,
    crypto_id BIGINT NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id)
);

-- Table des notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des tokens d'appareils
CREATE TABLE user_devices (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_token)
);

-- Table des opérations (pour tracer toutes les opérations effectuées)
CREATE TABLE operations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des transactions crypto (pour le détail des transactions crypto)
CREATE TABLE crypto_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    crypto_id BIGINT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    price_per_unit NUMERIC(20, 8) NOT NULL,
    total_amount NUMERIC(20, 8) NOT NULL,
    fee_amount NUMERIC(20, 8) NOT NULL,
    status VARCHAR(20) NOT NULL,
    transaction_hash VARCHAR(255),
    blockchain_confirmation_status VARCHAR(20),
    blockchain_confirmation_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id)
);

-- Table pour les administrateurs
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
DROP TRIGGER IF EXISTS update_user_updated_at ON users;
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_updated_at ON wallets;
CREATE TRIGGER update_wallet_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_position_updated_at ON portfolio_positions;
CREATE TRIGGER update_position_updated_at
    BEFORE UPDATE ON portfolio_positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transaction_updated_at ON transactions;
CREATE TRIGGER update_transaction_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_device_updated_at ON user_devices;
CREATE TRIGGER update_user_device_updated_at
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crypto_transaction_updated_at ON crypto_transactions;
CREATE TRIGGER update_crypto_transaction_updated_at
    BEFORE UPDATE ON crypto_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour créer automatiquement un portefeuille
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0.00);
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS create_wallet_after_user_insert ON users;
CREATE TRIGGER create_wallet_after_user_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_new_user();

-- Fonction pour sauvegarder l'historique des prix
CREATE OR REPLACE FUNCTION save_crypto_price_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.current_price IS NULL OR NEW.current_price != OLD.current_price THEN
        INSERT INTO crypto_price_history (crypto_id, price)
        VALUES (NEW.id, NEW.current_price);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour sauvegarder automatiquement l'historique des prix
DROP TRIGGER IF EXISTS crypto_price_history_trigger ON cryptocurrencies;
CREATE TRIGGER crypto_price_history_trigger
    AFTER UPDATE ON cryptocurrencies
    FOR EACH ROW
    EXECUTE FUNCTION save_crypto_price_history();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_crypto ON transactions(crypto_id);
CREATE INDEX IF NOT EXISTS idx_positions_wallet ON portfolio_positions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_positions_crypto ON portfolio_positions(crypto_id);
CREATE INDEX IF NOT EXISTS idx_cryptocurrencies_symbol ON cryptocurrencies(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_crypto ON price_alerts(crypto_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_price_history_crypto_id ON crypto_price_history(crypto_id);
CREATE INDEX IF NOT EXISTS idx_crypto_price_history_created_at ON crypto_price_history(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_user ON operations(user_id);
CREATE INDEX IF NOT EXISTS idx_operations_type ON operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_operations_created_at ON operations(created_at);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_crypto ON crypto_transactions(crypto_id);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_created_at ON crypto_transactions(created_at);

-- Créer l'utilisateur admin s'il n'existe pas
INSERT INTO users (nom, prenom, username, email, date_naissance, ville, password_hash)
VALUES ('Admin', 'System', 'admin', 'cedricandriamifidisoa23@gmail.com', '2000-01-01', 'System', '$2b$10$HA/y.Rp65fqHZXwJfNJlTu1UR1lmXGmQydQJTa0mS1p3yp6CMDTtK')
ON CONFLICT (username) DO NOTHING;

-- Attribuer le rôle admin
INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin'
AND r.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM users_roles
    WHERE user_id = u.id AND role_id = r.id
);
-- Insérer les paramètres de commission par défaut
INSERT INTO commission_settings (buy_commission, sell_commission)
SELECT 2.5, 2.5
WHERE NOT EXISTS (SELECT 1 FROM commission_settings);

-- Insérer les permissions de base
INSERT INTO permissions (name, description) VALUES
('manage_users', 'Gérer les utilisateurs'),
('manage_roles', 'Gérer les rôles'),
('manage_permissions', 'Gérer les permissions'),
('manage_crypto', 'Gérer les cryptomonnaies'),
('manage_commissions', 'Gérer les commissions'),
('view_reports', 'Voir les rapports')
ON CONFLICT (name) DO NOTHING;

-- Attribuer toutes les permissions au rôle admin
INSERT INTO roles_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM roles_permissions
    WHERE role_id = r.id AND permission_id = p.id
);

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
