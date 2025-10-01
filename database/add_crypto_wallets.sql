-- Supprimer la table si elle existe
DROP TABLE IF EXISTS crypto_wallets CASCADE;

-- Créer la table crypto_wallets avec contrainte d'unicité
CREATE TABLE crypto_wallets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL REFERENCES cryptocurrencies(symbol) ON DELETE CASCADE,
    balance DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_crypto UNIQUE (user_id, symbol)
);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_user ON crypto_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_wallets_symbol ON crypto_wallets(symbol);
