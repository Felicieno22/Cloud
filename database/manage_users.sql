-- Voir tous les utilisateurs avec leurs emails
SELECT id, email, nom, prenom, date_naissance, ville, created_at 
FROM users 
ORDER BY created_at DESC;

-- Voir les utilisateurs avec leurs portefeuilles
SELECT u.id, u.email, u.nom, u.prenom, w.balance 
FROM users u 
LEFT JOIN crypto_wallets w ON u.id = w.user_id 
ORDER BY u.created_at DESC;

-- Supprimer un utilisateur spécifique et toutes ses données associées
-- (Remplacer 'email@example.com' par l'email de l'utilisateur à supprimer)
BEGIN;
    -- Supprimer les portefeuilles
    DELETE FROM crypto_wallets 
    WHERE user_id IN (SELECT id FROM users WHERE email = 'cedricandriamifidisoa23@gmail.com');
    
    -- Supprimer les données de sécurité
    DELETE FROM user_security 
    WHERE user_id IN (SELECT id FROM users WHERE email = 'cedricandriamifidisoa23@gmail.com');
    
    -- Supprimer les sessions
    DELETE FROM sessions 
    WHERE user_id IN (SELECT id FROM users WHERE email = 'cedricandriamifidisoa23@gmail.com');
    
    -- Supprimer l'utilisateur
    DELETE FROM users 
    WHERE email = 'cedricandriamifidisoa23@gmail.com';
COMMIT;

-- Supprimer tous les utilisateurs et leurs données (ATTENTION: Utiliser avec précaution!)
/*
BEGIN;
    DELETE FROM crypto_wallets;
    DELETE FROM user_security;
    DELETE FROM sessions;
    DELETE FROM users;
COMMIT;
*/
