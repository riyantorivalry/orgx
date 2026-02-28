package com.orgx.attendance.controller;

import com.orgx.attendance.domain.Member;
import com.orgx.attendance.dto.CreateMemberRequest;
import com.orgx.attendance.dto.MemberResponse;
import com.orgx.attendance.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/members")
public class AdminMemberController {
    private final MemberService memberService;

    public AdminMemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public MemberResponse create(@Valid @RequestBody CreateMemberRequest request) {
        return toResponse(memberService.create(request));
    }

    @PutMapping("/{id}")
    public MemberResponse update(@PathVariable UUID id, @Valid @RequestBody CreateMemberRequest request) {
        return toResponse(memberService.update(id, request));
    }

    @GetMapping
    public List<MemberResponse> search(@RequestParam(required = false) String query) {
        return memberService.searchActive(query).stream().map(this::toResponse).toList();
    }

    private MemberResponse toResponse(Member member) {
        return new MemberResponse(member.getId(), member.getMemberCode(), member.getFullName(), member.isActive());
    }
}
