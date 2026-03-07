package com.orgx.attendance.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminAuthService {
    private final ConcurrentHashMap<String, SessionInfo> sessions = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.admin.username:admin}")
    private String configuredUsername;

    @Value("${app.admin.password:admin123}")
    private String configuredPassword;

    @Value("${app.admin.session-hours:12}")
    private long sessionHours;

    public Optional<String> login(String username, String password) {
        if (!configuredUsername.equals(username) || !configuredPassword.equals(password)) {
            return Optional.empty();
        }
        cleanupExpired();
        String token = generateToken();
        sessions.put(token, new SessionInfo(username, Instant.now().plus(Duration.ofHours(sessionHours))));
        return Optional.of(token);
    }

    public Optional<String> resolveUsername(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        SessionInfo sessionInfo = sessions.get(token);
        if (sessionInfo == null) {
            return Optional.empty();
        }
        if (Instant.now().isAfter(sessionInfo.expiresAt())) {
            sessions.remove(token);
            return Optional.empty();
        }
        return Optional.of(sessionInfo.username());
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        sessions.remove(token);
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        sessions.entrySet().removeIf(entry -> now.isAfter(entry.getValue().expiresAt()));
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private record SessionInfo(String username, Instant expiresAt) {
    }
}
