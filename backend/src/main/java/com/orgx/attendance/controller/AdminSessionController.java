package com.orgx.attendance.controller;

import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.domain.SessionToken;
import com.orgx.attendance.dto.CreateSessionRequest;
import com.orgx.attendance.dto.TokenResponse;
import com.orgx.attendance.service.SessionService;
import com.orgx.attendance.service.TokenService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/sessions")
public class AdminSessionController {
    private final SessionService sessionService;
    private final TokenService tokenService;

    public AdminSessionController(SessionService sessionService, TokenService tokenService) {
        this.sessionService = sessionService;
        this.tokenService = tokenService;
    }

    @PostMapping
    public AttendanceSession create(@Valid @RequestBody CreateSessionRequest request) {
        return sessionService.create(request);
    }

    @PostMapping("/{id}/start")
    public AttendanceSession start(@PathVariable UUID id) {
        return sessionService.start(id);
    }

    @PostMapping("/{id}/close")
    public AttendanceSession close(@PathVariable UUID id) {
        return sessionService.close(id);
    }

    @PostMapping("/{id}/tokens")
    public TokenResponse issueToken(@PathVariable UUID id) {
        SessionToken token = tokenService.issue(id);
        return new TokenResponse(id, token.getTokenHash(), token.getExpiresAt());
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok");
    }
}
