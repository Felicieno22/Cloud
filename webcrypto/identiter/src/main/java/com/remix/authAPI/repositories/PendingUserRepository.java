package com.remix.authAPI.repositories;

import com.remix.authAPI.entity.PendingUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PendingUserRepository extends JpaRepository<PendingUser, Long> {
    Optional<PendingUser> findByEmail(String email);
    Optional<PendingUser> findByEmailAndVerificationCode(String email, String code);
    void deleteByEmail(String email);
}
