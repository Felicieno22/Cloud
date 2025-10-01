package com.remix.authAPI.services;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import com.remix.authAPI.entity.User;
import com.remix.authAPI.entity.UserSecurity;
import com.remix.authAPI.repositories.UserRepository;
import com.remix.authAPI.repositories.UserSecurityRepository;

import java.util.List;
import java.security.SecureRandom;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSecurityRepository userSecurityRepository;

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
            System.out.println("Compte verrouillé pour : " + email);
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
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("L'email existe déjà");
        }

        // Encoder le mot de passe
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        
        // Sauvegarder l'utilisateur
        User savedUser = userRepository.save(user);

        // Créer et sauvegarder les informations de sécurité de l'utilisateur
        UserSecurity userSecurity = new UserSecurity();
        userSecurity.setUserId(savedUser.getId());
        String verificationToken = UUID.randomUUID().toString();
        userSecurity.setEmailVerificationToken(verificationToken);
        userSecurity.setEmailVerificationExpiry(LocalDateTime.now().plusHours(24));
        userSecurityRepository.save(userSecurity);

        // Envoyer l'email de vérification
        String verificationLink = "http://localhost:8080/api/auth/verify-email?token=" + verificationToken;
        emailService.sendVerificationEmail(user.getEmail(), verificationLink);

        return savedUser;
    }

    @Transactional
    public void verifyEmail(String token) {
        UserSecurity userSecurity = userSecurityRepository.findByEmailVerificationToken(token)
            .orElseThrow(() -> new RuntimeException("Token de vérification invalide"));

        if (userSecurity.getIsEmailVerified()) {
            throw new RuntimeException("Cet email a déjà été vérifié");
        }

        if (userSecurity.getEmailVerificationExpiry() == null || 
            LocalDateTime.now().isAfter(userSecurity.getEmailVerificationExpiry())) {
            
            // Générer un nouveau token
            String newToken = UUID.randomUUID().toString();
            userSecurity.setEmailVerificationToken(newToken);
            userSecurity.setEmailVerificationExpiry(LocalDateTime.now().plusHours(24));
            userSecurityRepository.save(userSecurity);
            
            // Envoyer un nouveau mail
            User user = userRepository.findById(userSecurity.getUserId())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
            String verificationLink = "http://localhost:8080/api/auth/verify-email?token=" + newToken;
            emailService.sendVerificationEmail(user.getEmail(), verificationLink);
            
            throw new RuntimeException("Le lien de vérification a expiré. Un nouveau lien vous a été envoyé par email.");
        }

        // Marquer l'email comme vérifié et supprimer le token
        userSecurity.setIsEmailVerified(true);
        userSecurity.setEmailVerificationToken(null);
        userSecurity.setEmailVerificationExpiry(null);
        userSecurityRepository.save(userSecurity);
    }

    @Transactional
    public User authenticateUser(String email, String password) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Email ou mot de passe incorrect"));

        // Vérifier si le compte est verrouillé
        if (isAccountLocked(email)) {
            throw new RuntimeException("Compte temporairement verrouillé. Veuillez réessayer plus tard.");
        }

        // Vérifier si l'email est vérifié
        UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
        if (!userSecurity.getIsEmailVerified()) {
            throw new RuntimeException("Veuillez vérifier votre email avant de vous connecter");
        }

        // Vérifier le mot de passe
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            this.incrementFailedLoginAttempts(email);
            throw new RuntimeException("Email ou mot de passe incorrect");
        }

        // Réinitialiser les tentatives de connexion en cas de succès
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
        String twoFactorCode = generateTwoFactorCode();
        UserSecurity userSecurity = userSecurityRepository.findByUserId(user.getId())
            .orElseThrow(() -> new RuntimeException("UserSecurity non trouvé"));
        userSecurity.setMfaToken(twoFactorCode);
        userSecurity.setMfaTokenExpiry(LocalDateTime.now().plusMinutes(5));
        userSecurityRepository.save(userSecurity);
        
        // Envoyer le code par email
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
            throw new RuntimeException("Compte temporairement verrouillé. Vérifiez vos emails pour le débloquer.");
        }

        if (userSecurity.getMfaToken() == null || userSecurity.getMfaTokenExpiry() == null) {
            throw new RuntimeException("Aucun code 2FA n'a été généré");
        }

        if (LocalDateTime.now().isAfter(userSecurity.getMfaTokenExpiry())) {
            throw new RuntimeException("Le code 2FA a expiré");
        }

        if (!userSecurity.getMfaToken().equals(code)) {
            increment2FAAttempts(email);
            throw new RuntimeException("Code 2FA invalide");
        }

        // Réinitialiser les tentatives en cas de succès
        reset2FAAttempts(email);
        resetFailedLoginAttempts(email);

        // Nettoyer le code 2FA après utilisation
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

    // private void sendUnlockEmail(String email) {
    //     String unlockToken = UUID.randomUUID().toString();
    //     User user = userRepository.findByEmail(email).orElseThrow();
    //     user.setUnlockToken(unlockToken);
    //     userRepository.save(user);
        
    //     String unlockLink = "http://localhost:8080/api/auth/unlock-account?token=" + unlockToken;
    //     emailService.sendUnlockEmail(email, unlockLink);
    // }

    // @Transactional
    // public void unlockAccount(String token) {
    //     User user = userRepository.findByUnlockToken(token)
    //         .orElseThrow(() -> new RuntimeException("Token invalide"));
        
    //     user.setAccountLocked(false);
    //     user.setAccountLockedUntil(null);
    //     user.setFailedLoginAttempts(0);
    //     user.setFailed2FAAttempts(0);
    //     user.setUnlockToken(null);
    //     userRepository.save(user);
    // }
}