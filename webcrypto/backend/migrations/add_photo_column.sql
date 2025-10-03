-- Migration pour ajouter la colonne photo à la table users
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT;

-- Mettre à jour les utilisateurs existants avec une valeur NULL pour la photo
UPDATE users SET photo = NULL WHERE photo IS NULL; 