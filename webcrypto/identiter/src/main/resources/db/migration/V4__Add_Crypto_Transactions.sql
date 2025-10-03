-- Table des transactions crypto
CREATE TABLE crypto_transactions (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL,
    crypto_id BIGINT NOT NULL,
    type VARCHAR(4) NOT NULL CHECK (type IN ('BUY', 'SELL')),
    amount NUMERIC(20, 8) NOT NULL,
    quantity NUMERIC(20, 8) NOT NULL,
    price NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id),
    FOREIGN KEY (crypto_id) REFERENCES cryptocurrencies(id)
);
