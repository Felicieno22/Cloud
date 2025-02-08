package com.remix.authAPI.services;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.remix.authAPI.entity.UserSecurity;
import com.remix.authAPI.repositories.UserSecurityRepository;

@Service
public class UserSecurityService {

    @Autowired
    private UserSecurityRepository userSecurityRepository;

    public UserSecurityService(UserSecurityRepository userSecurityRepository) {
        this.userSecurityRepository = userSecurityRepository;
    }

    @Transactional(readOnly = true)
    public Optional<UserSecurity> findByUserId(Long userId) {
        return userSecurityRepository.findByUserId(userId);
    }

    @Transactional
    public UserSecurity updateUserSecurity(UserSecurity userSecurity) {
        return userSecurityRepository.save(userSecurity);
    }

    @Transactional
    public void incrementFailedLoginAttempts(Long userId) {
        userSecurityRepository.findByUserId(userId).ifPresent(userSecurity -> {
            userSecurity.setFailedLoginAttempts(userSecurity.getFailedLoginAttempts() + 1);
            userSecurity.setLastFailedLogin(LocalDateTime.now());
            userSecurityRepository.save(userSecurity);
        });
    }

    @Transactional
    public void resetFailedLoginAttempts(Long userId) {
        userSecurityRepository.findByUserId(userId).ifPresent(userSecurity -> {
            userSecurity.setFailedLoginAttempts(0);
            userSecurity.setLastFailedLogin(null);
            userSecurityRepository.save(userSecurity);
        });
    }

    @Transactional
    public void lockAccount(Long userId) {
        userSecurityRepository.findByUserId(userId).ifPresent(userSecurity -> {
            userSecurity.setAccountLocked(true);
            userSecurity.setAccountLockedUntil(LocalDateTime.now().plusHours(1));
            userSecurityRepository.save(userSecurity);
        });
    }

    @Transactional
    public void unlockAccount(Long userId) {
        userSecurityRepository.findByUserId(userId).ifPresent(userSecurity -> {
            userSecurity.setAccountLocked(false);
            userSecurity.setAccountLockedUntil(null);
            userSecurityRepository.save(userSecurity);
        });
    }
}