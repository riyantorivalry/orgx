package com.orgx.attendance.controller;

import com.orgx.attendance.config.AdminRequestUser;
import com.orgx.attendance.domain.Member;
import com.orgx.attendance.dto.AdminMemberAttendanceSessionResponse;
import com.orgx.attendance.dto.AdminMemberAttendanceStatsResponse;
import com.orgx.attendance.dto.AdminMemberResponse;
import com.orgx.attendance.dto.CreateMemberRequest;
import com.orgx.attendance.service.AdminMonitoringService;
import com.orgx.attendance.service.MemberService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/members")
public class AdminMemberController {
    private final MemberService memberService;
    private final AdminMonitoringService adminMonitoringService;

    public AdminMemberController(MemberService memberService, AdminMonitoringService adminMonitoringService) {
        this.memberService = memberService;
        this.adminMonitoringService = adminMonitoringService;
    }

    @PostMapping
    public AdminMemberResponse create(@Valid @RequestBody CreateMemberRequest request, HttpServletRequest httpServletRequest) {
        String adminUsername = AdminRequestUser.requireUsername(httpServletRequest);
        return toResponse(memberService.create(request, adminUsername));
    }

    @PutMapping("/{id}")
    public AdminMemberResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateMemberRequest request,
            HttpServletRequest httpServletRequest
    ) {
        String adminUsername = AdminRequestUser.requireUsername(httpServletRequest);
        return toResponse(memberService.update(id, request, adminUsername));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        memberService.delete(id);
    }

    @GetMapping
    public List<AdminMemberResponse> search(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "true") boolean includeInactive
    ) {
        return memberService.searchForAdmin(query, includeInactive).stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public AdminMemberResponse get(@PathVariable UUID id) {
        return toResponse(memberService.getRequired(id));
    }

    @GetMapping("/{id}/attendance-sessions")
    public List<AdminMemberAttendanceSessionResponse> attendanceSessions(@PathVariable UUID id) {
        return adminMonitoringService.memberAttendanceSessions(id);
    }

    @GetMapping("/{id}/attendance-stats")
    public AdminMemberAttendanceStatsResponse attendanceStats(@PathVariable UUID id) {
        return adminMonitoringService.memberAttendanceStats(id);
    }

    private AdminMemberResponse toResponse(Member member) {
        return new AdminMemberResponse(
                member.getId(),
                member.getMemberCode(),
                member.getFullName(),
                member.isActive(),
                member.getCreatedBy(),
                member.getUpdatedBy(),
                member.getCreatedAt(),
                member.getUpdatedAt(),
                member.getDob(),
                member.getBloodType(),
                member.getAddress(),
                member.getEmail(),
                member.getMobileNumber()
        );
    }
}
