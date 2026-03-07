package com.orgx.attendance.controller;

import com.orgx.attendance.dto.AttendanceSubmitRequest;
import com.orgx.attendance.dto.MemberResponse;
import com.orgx.attendance.dto.PublicSessionResponse;
import com.orgx.attendance.service.AttendanceService;
import com.orgx.attendance.service.MemberService;
import com.orgx.attendance.service.SessionService;
import com.orgx.attendance.service.TokenService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/public")
public class PublicAttendanceController {
    private final AttendanceService attendanceService;
    private final MemberService memberService;
    private final TokenService tokenService;
    private final SessionService sessionService;

    public PublicAttendanceController(
            AttendanceService attendanceService,
            MemberService memberService,
            TokenService tokenService,
            SessionService sessionService
    ) {
        this.attendanceService = attendanceService;
        this.memberService = memberService;
        this.tokenService = tokenService;
        this.sessionService = sessionService;
    }

    @GetMapping("/sessions/by-token/{token}")
    public PublicSessionResponse sessionByToken(@PathVariable String token) {
        var sessionToken = tokenService.validateRawToken(token);
        var session = sessionToken.getSession();
        attendanceService.ensureSessionOpen(session);

        return new PublicSessionResponse(
                session.getId(),
                session.getEventName(),
                session.getStartsAt(),
                session.getEndsAt(),
                session.getStatus().name(),
                sessionToken.getExpiresAt()
        );
    }

    @GetMapping("/sessions/{id}/members")
    public List<MemberResponse> members(@PathVariable UUID id, @RequestParam(required = false) String query) {
        attendanceService.ensureSessionOpen(sessionService.getRequired(id));
        return memberService.searchActive(query).stream()
                .map(m -> new MemberResponse(m.getId(), m.getMemberCode(), m.getFullName(), m.isActive()))
                .toList();
    }

    @PostMapping("/attendance")
    public Map<String, String> submit(@Valid @RequestBody AttendanceSubmitRequest request) {
        AttendanceService.SubmitResult result = attendanceService.submit(request.token(), request.memberId());
        return Map.of("status", result.status(), "message", result.message());
    }
}
