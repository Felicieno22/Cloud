package com.remix.authAPI.services;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.remix.authAPI.entity.User;
import com.remix.authAPI.entity.UserSecurity;
import com.remix.authAPI.entity.PendingUser;
import com.remix.authAPI.repositories.UserRepository;
import com.remix.authAPI.repositories.UserSecurityRepository;
import com.remix.authAPI.repositories.PendingUserRepository;

import java.util.List;
import java.security.SecureRandom;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSecurityRepository userSecurityRepository;

    @Autowired
    private PendingUserRepository pendingUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;
    
    @Value("${app.security.max-login-attempts}")
    private Integer maxLoginAttempts;

    @Value("${app.security.two-factor-code-length}")
    private int twoFactorCodeLength;

    @Autowired
    private LoginAttemptService loginAttemptService;

    public UserService(UserRepository userRepository, UserSecurityRepository userSecurityRepository) {
        this.userRepository = userRepository;
        this.userSecurityRepository = userSecurityRepository;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public User save(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    @Transactional
    public boolean isLoginAttemptsExceeded(String email) {
        return loginAttemptService.isBlocked(email);
    }

    @Transactional
    public void incrementFailedLoginAttempts(String email) {
        // D'abord incrémenter le compteur en mémoire
        loginAttemptService.loginFailed(email);
        
        // Si le nombre de tentatives dépasse la limite, verrouiller le compte
        if (loginAttemptService.isBlocked(email)) {
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            
            UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
            
            userSecurity.setAccountLocked(true);
            userSecurity.setAccountLockedUntil(LocalDateTime.now().plusHours(1));
            userSecurityRepository.save(userSecurity);
            logger.info("Compte verrouillé pour : " + email);
        }
    }

    @Transactional
    public void resetFailedLoginAttempts(String email) {
        loginAttemptService.loginSucceeded(email);
        
        // Déverrouiller aussi le compte dans la base de données
        userRepository.findByEmail(email).ifPresent(user -> {
            UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
            
            userSecurity.setAccountLocked(false);
            userSecurity.setAccountLockedUntil(null);
            userSecurityRepository.save(userSecurity);
        });
    }

    @Transactional(readOnly = true)
    public boolean isAccountLocked(String email) {
        return userRepository.findByEmail(email)
            .map(user -> {
                UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
                
                if (userSecurity.getAccountLocked() && userSecurity.getAccountLockedUntil() != null) {
                    // Si la période de verrouillage est passée, déverrouille le compte
                    if (LocalDateTime.now().isAfter(userSecurity.getAccountLockedUntil())) {
                        userSecurity.setAccountLocked(false);
                        userSecurity.setAccountLockedUntil(null);
                        userSecurity.setFailedLoginAttempts(0);
                        userSecurityRepository.save(userSecurity);
                        return false;
                    }
                    return true;
                }
                return false;
            })
            .orElse(false);
    }

    @Transactional
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    @Transactional
    public User registerUser(User user) {
        logger.info("Début du processus d'inscription pour l'email : {}", user.getEmail());
        
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            logger.error("Tentative d'inscription avec un email déjà existant : {}", user.getEmail());
            throw new RuntimeException("L'email existe déjà");
        }

        if (pendingUserRepository.findByEmail(user.getEmail()).isPresent()) {
            logger.error("Un compte est déjà en attente de vérification pour cet email : {}", user.getEmail());
            throw new RuntimeException("Un compte est déjà en attente de vérification pour cet email");
        }

        try {
            // Encoder le mot de passe
            logger.debug("Encodage du mot de passe...");
            String encodedPassword = passwordEncoder.encode(user.getPasswordHash());
            
            // Créer un utilisateur en attente
            PendingUser pendingUser = new PendingUser();
            pendingUser.setNom(user.getNom());
            pendingUser.setPrenom(user.getPrenom());
            pendingUser.setEmail(user.getEmail());
            pendingUser.setUsername(user.getUsername());
            pendingUser.setPasswordHash(encodedPassword);
            pendingUser.setDateNaissance(user.getDateNaissance());
            pendingUser.setVille(user.getVille());
            
            // Générer le code de vérification
            String verificationCode = generateVerificationCode();
            pendingUser.setVerificationCode(verificationCode);
            pendingUser.setVerificationExpiry(LocalDateTime.now().plusMinutes(15));
            
            // Sauvegarder l'utilisateur en attente
            logger.debug("Sauvegarde de l'utilisateur en attente...");
            pendingUserRepository.save(pendingUser);
            
            // Envoyer l'email avec le code de vérification
            logger.info("Envoi de l'email de vérification avec le code : {}", verificationCode);
            emailService.sendRegistrationVerificationCode(user.getEmail(), verificationCode);
            logger.info("Processus d'inscription temporaire terminé avec succès pour l'email : {}", user.getEmail());

            return user; // Retourner l'utilisateur sans l'ID car il n'est pas encore dans la table principale
        } catch (Exception e) {
            logger.error("Erreur lors de l'inscription de l'utilisateur {} : {}", user.getEmail(), e.getMessage(), e);
            throw new RuntimeException("Erreur lors de l'inscription : " + e.getMessage(), e);
        }
    }

    @Transactional
    public void verifyEmail(String email, String code) {
        PendingUser pendingUser = pendingUserRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Aucune inscription en attente trouvée pour cet email"));

        if (pendingUser.getVerificationExpiry().isBefore(LocalDateTime.now())) {
            // Générer un nouveau code
            logger.info("Génération d'un nouveau code de vérification pour l'email : {}", email);
            String newCode = generateVerificationCode();
            pendingUser.setVerificationCode(newCode);
            pendingUser.setVerificationExpiry(LocalDateTime.now().plusMinutes(15));
            pendingUserRepository.save(pendingUser);
            
            // Envoyer un nouveau code
            logger.info("Envoi d'un nouveau code de vérification pour l'email : {}", email);
            emailService.sendRegistrationVerificationCode(email, newCode);
            
            logger.error("Le code de vérification a expiré. Un nouveau code vous a été envoyé par email.");
            throw new RuntimeException("Le code de vérification a expiré. Un nouveau code vous a été envoyé par email.");
        }

        if (!pendingUser.getVerificationCode().equals(code)) {
            logger.error("Tentative de vérification avec un code invalide pour l'email : {}", email);
            throw new RuntimeException("Code de vérification invalide");
        }

        try {
            // Créer l'utilisateur vérifié
            User user = new User();
            user.setNom(pendingUser.getNom());
            user.setPrenom(pendingUser.getPrenom());
            user.setEmail(pendingUser.getEmail());
            user.setUsername(pendingUser.getUsername());
            user.setPasswordHash(pendingUser.getPasswordHash());
            user.setDateNaissance(pendingUser.getDateNaissance()); // Maintenant les deux sont LocalDate
            user.setVille(pendingUser.getVille());
            
            // Sauvegarder l'utilisateur
            User savedUser = userRepository.save(user);
            
            // Créer et sauvegarder les informations de sécurité
            UserSecurity userSecurity = new UserSecurity();
            userSecurity.setUserId(savedUser.getId());
            userSecurity.setIsEmailVerified(true);
            userSecurityRepository.save(userSecurity);
            
            // Supprimer l'utilisateur en attente
            pendingUserRepository.deleteByEmail(email);
            
            logger.info("Email vérifié avec succès et compte créé pour : {}", email);
        } catch (Exception e) {
            logger.error("Erreur lors de la création du compte après vérification pour {} : {}", email, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la création du compte : " + e.getMessage());
        }
    }

    @Transactional
    public User authenticateUser(String email, String password) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Email ou mot de passe incorrect"));

        // Vérifier si le compte est verrouillé
        if (isAccountLocked(email)) {
            logger.error("Tentative de connexion avec un compte verrouillé : {}", email);
            throw new RuntimeException("Compte temporairement verrouillé. Veuillez réessayer plus tard.");
        }

        // Vérifier si l'email est vérifié
        UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
        if (!userSecurity.getIsEmailVerified()) {
            logger.error("Tentative de connexion avec un email non vérifié : {}", email);
            throw new RuntimeException("Veuillez vérifier votre email avant de vous connecter");
        }

        // Vérifier le mot de passe
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            logger.error("Tentative de connexion avec un mot de passe incorrect pour l'email : {}", email);
            this.incrementFailedLoginAttempts(email);
            throw new RuntimeException("Email ou mot de passe incorrect");
        }

        // Réinitialiser les tentatives de connexion en cas de succès
        logger.info("Réinitialisation des tentatives de connexion pour l'email : {}", email);
        resetFailedLoginAttempts(email);
        
        return user;
    }

    private String generateTwoFactorCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < twoFactorCodeLength; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

    @Transactional
    public User initiateLogin(String email, String password) {
        User user = authenticateUser(email, password);
        
        // Générer et sauvegarder le code 2FA
        logger.info("Génération du code 2FA pour l'email : {}", email);
        String twoFactorCode = generateTwoFactorCode();
        UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
        userSecurity.setMfaToken(twoFactorCode);
        userSecurity.setMfaTokenExpiry(LocalDateTime.now().plusMinutes(5));
        userSecurityRepository.save(userSecurity);
        
        // Envoyer le code par email
        logger.info("Envoi du code 2FA pour l'email : {}", email);
        emailService.send2FACode(user.getEmail(), twoFactorCode);
        
        return user;
    }

    @Transactional
    public User verifyTwoFactorCode(String email, String code) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));

        if (isAccountLocked(email)) {
            logger.error("Tentative de vérification du code 2FA avec un compte verrouillé : {}", email);
            throw new RuntimeException("Compte temporairement verrouillé. Vérifiez vos emails pour le débloquer.");
        }

        if (userSecurity.getMfaToken() == null || userSecurity.getMfaTokenExpiry() == null) {
            logger.error("Aucun code 2FA n'a été généré pour l'email : {}", email);
            throw new RuntimeException("Aucun code 2FA n'a été généré");
        }

        if (LocalDateTime.now().isAfter(userSecurity.getMfaTokenExpiry())) {
            logger.error("Le code 2FA a expiré pour l'email : {}", email);
            throw new RuntimeException("Le code 2FA a expiré");
        }

        if (!userSecurity.getMfaToken().equals(code)) {
            logger.error("Tentative de vérification avec un code 2FA invalide pour l'email : {}", email);
            increment2FAAttempts(email);
            throw new RuntimeException("Code 2FA invalide");
        }

        // Réinitialiser les tentatives en cas de succès
        logger.info("Réinitialisation des tentatives pour l'email : {}", email);
        reset2FAAttempts(email);
        resetFailedLoginAttempts(email);

        // Nettoyer le code 2FA après utilisation
        logger.info("Nettoyage du code 2FA pour l'email : {}", email);
        userSecurity.setMfaToken(null);
        userSecurity.setMfaTokenExpiry(null);
        userSecurityRepository.save(userSecurity);
        return user;
    }

    @Transactional
    public void increment2FAAttempts(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
            userSecurity.setFailed2FAAttempts(userSecurity.getFailed2FAAttempts() + 1);
            userSecurity.setLastFailed2FALogin(LocalDateTime.now());
            
            if (userSecurity.getFailed2FAAttempts() >= maxLoginAttempts) {
                userSecurity.setAccountLocked(true);
                userSecurity.setAccountLockedUntil(LocalDateTime.now().plusHours(1));
                // Envoyer un email de réinitialisation
                // sendUnlockEmail(user.getEmail());
            }
            
            userSecurityRepository.save(userSecurity);
        });
    }

    @Transactional
    public void reset2FAAttempts(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
            userSecurity.setFailed2FAAttempts(0);
            userSecurity.setLastFailed2FALogin(null);
            userSecurityRepository.save(userSecurity);
        });
    }

    private String generateVerificationCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }
}