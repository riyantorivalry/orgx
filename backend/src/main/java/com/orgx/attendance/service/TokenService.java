package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.domain.SessionToken;
import com.orgx.attendance.repository.AttendanceSessionRepository;
import com.orgx.attendance.repository.SessionTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

import static org.springframework.http.HttpStatus.GONE;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class TokenService {
    private final SessionTokenRepository tokenRepository;
    private final AttendanceSessionRepository sessionRepository;

    public TokenService(SessionTokenRepository tokenRepository, AttendanceSessionRepository sessionRepository) {
        this.tokenRepository = tokenRepository;
        this.sessionRepository = sessionRepository;
    }

    public IssuedToken issue(UUID sessionId) {
        AttendanceSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
        String raw = UUID.randomUUID() + "." + UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime expiresAt = now.plusMinutes(5);

        SessionToken token = new SessionToken();
        token.setSession(session);
        token.setIssuedAt(now);
        token.setExpiresAt(expiresAt);
        token.setTokenHash(hash(raw));
        token.setRevoked(false);
        tokenRepository.save(token);

        return new IssuedToken(sessionId, raw, expiresAt);
    }

    public SessionToken validateRawToken(String rawToken) {
        String tokenHash = hash(rawToken);
        SessionToken token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid token"));

        if (token.isRevoked()) {
            throw new ResponseStatusException(UNAUTHORIZED, "Token revoked");
        }
        if (!token.getExpiresAt().isAfter(OffsetDateTime.now())) {
            throw new ResponseStatusException(GONE, "Token expired");
        }
        return token;
    }

    private String hash(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    public record IssuedToken(UUID sessionId, String token, OffsetDateTime expiresAt) {
    }
}
