package com.orgx.attendance.controller;

import com.orgx.attendance.dto.AttendanceSubmitRequest;
import com.orgx.attendance.dto.MemberResponse;
import com.orgx.attendance.service.AttendanceService;
import com.orgx.attendance.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicAttendanceController {
    private final AttendanceService attendanceService;
    private final MemberService memberService;

    public PublicAttendanceController(AttendanceService attendanceService, MemberService memberService) {
        this.attendanceService = attendanceService;
        this.memberService = memberService;
    }

    @GetMapping("/members")
    public List<MemberResponse> members(@RequestParam(required = false) String query) {
        return memberService.searchActive(query).stream()
                .map(m -> new MemberResponse(m.getId(), m.getMemberCode(), m.getFullName(), m.isActive()))
                .toList();
    }

    @PostMapping("/attendance")
    public Map<String, String> submit(@Valid @RequestBody AttendanceSubmitRequest request) {
        String result = attendanceService.submit(request.token(), request.memberId());
        return Map.of("message", result);
    }
}
