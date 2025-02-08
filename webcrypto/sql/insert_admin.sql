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