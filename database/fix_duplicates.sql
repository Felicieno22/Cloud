-- Supprimer les doublons dans crypto_wallets
WITH duplicates AS (
    SELECT user_id, symbol,
           ROW_NUMBER() OVER (PARTITION BY user_id, symbol ORDER BY id) as rnum
    FROM crypto_wallets
)
DELETE FROM crypto_wallets
WHERE id IN (
    SELECT cw.id
    FROM crypto_wallets cw
    JOIN duplicates d ON cw.user_id = d.user_id AND cw.symbol = d.symbol
    WHERE d.rnum > 1
);
