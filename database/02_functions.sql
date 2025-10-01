-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Fonction pour empêcher la modification de l'email
CREATE OR REPLACE FUNCTION prevent_email_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.email <> NEW.email THEN
        RAISE EXCEPTION 'La modification de l''email n''est pas autorisée';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réinitialiser les tentatives de connexion échouées
CREATE OR REPLACE FUNCTION reset_failed_login_attempts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_security
    SET failed_login_attempts = 0,
        last_failed_login = NULL,
        account_locked = FALSE,
        account_locked_until = NULL
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour verrouiller le compte après trop de tentatives
CREATE OR REPLACE FUNCTION lock_account_after_failed_attempts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.failed_login_attempts >= 3 THEN
        UPDATE user_security
        SET account_locked = TRUE,
            account_locked_until = CURRENT_TIMESTAMP + INTERVAL '1 hour'
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour réinitialiser les tentatives via email
CREATE OR REPLACE FUNCTION reset_failed_login_attempts_via_email()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_security
    SET failed_login_attempts = 0,
        last_failed_login = NULL,
        account_locked = FALSE,
        account_locked_until = NULL
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour la mise à jour du timestamp
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crypto_holdings_updated_at
    BEFORE UPDATE ON crypto_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour empêcher la modification de l'email
CREATE TRIGGER prevent_email_update_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_email_update();

-- Trigger pour réinitialiser les tentatives de connexion
CREATE TRIGGER reset_failed_login_attempts_trigger
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION reset_failed_login_attempts();

-- Trigger pour verrouiller le compte
CREATE TRIGGER lock_account_after_failed_attempts_trigger
    AFTER UPDATE ON user_security
    FOR EACH ROW
    EXECUTE FUNCTION lock_account_after_failed_attempts();

-- Trigger pour réinitialiser les tentatives via email
CREATE TRIGGER reset_failed_login_attempts_via_email_trigger
    AFTER UPDATE ON user_security
    FOR EACH ROW
    WHEN (NEW.email_verification_token IS NOT NULL AND OLD.email_verification_token IS NULL)
    EXECUTE FUNCTION reset_failed_login_attempts_via_email();
