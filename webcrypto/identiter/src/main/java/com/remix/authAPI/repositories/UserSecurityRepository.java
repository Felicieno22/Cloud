package com.remix.authAPI.repositories;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.remix.authAPI.entity.UserSecurity;

public interface UserSecurityRepository extends JpaRepository<UserSecurity, Long> {
    Optional<UserSecurity> findByUserId(Long userId);
    Optional<UserSecurity> findByEmailVerificationCode(String code);

    @Modifying
    @Query("UPDATE UserSecurity us SET us.failedLoginAttempts = us.failedLoginAttempts + 1, " +
           "us.lastFailedLogin = :now, " +
           "us.accountLocked = :locked, " +
           "us.accountLockedUntil = :lockedUntil " +
           "WHERE us.userId = :userId")
    void incrementLoginAttempts(
        @Param("userId") Long userId, 
        @Param("now") LocalDateTime now,
        @Param("locked") boolean locked,
        @Param("lockedUntil") LocalDateTime lockedUntil
    );
}