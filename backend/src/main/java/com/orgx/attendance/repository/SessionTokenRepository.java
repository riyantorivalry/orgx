package com.orgx.attendance.repository;

import com.orgx.attendance.domain.SessionToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SessionTokenRepository extends JpaRepository<SessionToken, UUID> {
    Optional<SessionToken> findByTokenHash(String tokenHash);
}
