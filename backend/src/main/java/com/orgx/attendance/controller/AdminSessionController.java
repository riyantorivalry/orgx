package com.orgx.attendance.controller;

import com.orgx.attendance.config.AdminRequestUser;
import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.dto.AdminAttendanceRecordResponse;
import com.orgx.attendance.dto.AdminSessionListItemResponse;
import com.orgx.attendance.dto.AdminSessionDashboardResponse;
import com.orgx.attendance.dto.CreateSessionRequest;
import com.orgx.attendance.dto.TokenResponse;
import com.orgx.attendance.service.AdminMonitoringService;
import com.orgx.attendance.service.SessionService;
import com.orgx.attendance.service.TokenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/sessions")
public class AdminSessionController {
    private final SessionService sessionService;
    private final TokenService tokenService;
    private final AdminMonitoringService adminMonitoringService;

    public AdminSessionController(
            SessionService sessionService,
            TokenService tokenService,
            AdminMonitoringService adminMonitoringService
    ) {
        this.sessionService = sessionService;
        this.tokenService = tokenService;
        this.adminMonitoringService = adminMonitoringService;
    }

    @PostMapping
    public AttendanceSession create(@Valid @RequestBody CreateSessionRequest request, HttpServletRequest httpServletRequest) {
        String adminUsername = AdminRequestUser.requireUsername(httpServletRequest);
        return sessionService.create(request, adminUsername);
    }

    @GetMapping
    public List<AdminSessionListItemResponse> list() {
        return sessionService.list();
    }

    @PostMapping("/{id}/start")
    public AttendanceSession start(@PathVariable UUID id, HttpServletRequest httpServletRequest) {
        String adminUsername = AdminRequestUser.requireUsername(httpServletRequest);
        return sessionService.start(id, adminUsername);
    }

    @PostMapping("/{id}/close")
    public AttendanceSession close(@PathVariable UUID id, HttpServletRequest httpServletRequest) {
        String adminUsername = AdminRequestUser.requireUsername(httpServletRequest);
        return sessionService.close(id, adminUsername);
    }

    @PutMapping("/{id}")
    public AttendanceSession update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateSessionRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String adminUsername = AdminRequestUser.requireUsername(httpServletRequest);
        return sessionService.update(id, request, adminUsername);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        sessionService.delete(id);
    }

    @PostMapping("/{id}/tokens")
    public TokenResponse issueToken(@PathVariable UUID id) {
        TokenService.IssuedToken issuedToken = tokenService.issue(id);
        return new TokenResponse(issuedToken.sessionId(), issuedToken.token(), issuedToken.expiresAt());
    }

    @GetMapping("/{id}")
    public AdminSessionDashboardResponse dashboard(@PathVariable UUID id) {
        return adminMonitoringService.dashboard(id);
    }

    @GetMapping("/{id}/detail")
    public AttendanceSession detail(@PathVariable UUID id) {
        return sessionService.getRequired(id);
    }

    @GetMapping("/{id}/attendance")
    public List<AdminAttendanceRecordResponse> attendance(@PathVariable UUID id) {
        return adminMonitoringService.attendanceList(id);
    }

    @GetMapping(value = "/{id}/export.csv", produces = "text/csv")
    public ResponseEntity<String> exportCsv(@PathVariable UUID id) {
        String csv = adminMonitoringService.exportCsv(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"attendance-" + id + ".csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok");
    }
}
