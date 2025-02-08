package com.remix.authAPI.repositories;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.remix.authAPI.entity.Session;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByToken(String token);
    
    @Modifying
    @Query("DELETE FROM Session s WHERE s.expiresAt < :expirationTime OR s.lastActivity < :inactivityTime")
    void deleteExpiredSessions(@Param("expirationTime") LocalDateTime expirationTime, @Param("inactivityTime") LocalDateTime inactivityTime);
    
    void deleteByUser_Id(Long userId);
}