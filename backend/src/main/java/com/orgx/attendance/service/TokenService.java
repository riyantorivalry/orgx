package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.domain.SessionToken;
import com.orgx.attendance.repository.AttendanceSessionRepository;
import com.orgx.attendance.repository.SessionTokenRepository;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class TokenService {
    private final SessionTokenRepository tokenRepository;
    private final AttendanceSessionRepository sessionRepository;

    public TokenService(SessionTokenRepository tokenRepository, AttendanceSessionRepository sessionRepository) {
        this.tokenRepository = tokenRepository;
        this.sessionRepository = sessionRepository;
    }

    public SessionToken issue(UUID sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId).orElseThrow();
        String raw = UUID.randomUUID() + "." + UUID.randomUUID();
        SessionToken token = new SessionToken();
        token.setSession(session);
        token.setIssuedAt(OffsetDateTime.now());
        token.setExpiresAt(OffsetDateTime.now().plusMinutes(5));
        token.setTokenHash(hash(raw));
        token.setRevoked(false);
        SessionToken saved = tokenRepository.save(token);
        saved.setTokenHash(raw);
        return saved;
    }

    public SessionToken validateRawToken(String rawToken) {
        return tokenRepository.findByTokenHashAndRevokedFalseAndExpiresAtAfter(hash(rawToken), OffsetDateTime.now())
                .orElseThrow();
    }

    private String hash(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
