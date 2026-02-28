package com.orgx.attendance.service;

import com.orgx.attendance.domain.Member;
import com.orgx.attendance.dto.CreateMemberRequest;
import com.orgx.attendance.repository.MemberRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class MemberService {
    private final MemberRepository memberRepository;

    public MemberService(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public Member create(CreateMemberRequest request) {
        Member member = new Member();
        member.setMemberCode(request.memberCode());
        member.setFullName(request.fullName());
        member.setActive(request.active());
        member.setCreatedAt(OffsetDateTime.now());
        member.setUpdatedAt(OffsetDateTime.now());
        return memberRepository.save(member);
    }

    public List<Member> searchActive(String query) {
        if (query == null || query.isBlank()) {
            return memberRepository.findAll().stream().filter(Member::isActive).toList();
        }
        return memberRepository.findByFullNameContainingIgnoreCaseAndActiveTrue(query);
    }

    public Member update(UUID id, CreateMemberRequest request) {
        Member member = memberRepository.findById(id).orElseThrow();
        member.setMemberCode(request.memberCode());
        member.setFullName(request.fullName());
        member.setActive(request.active());
        member.setUpdatedAt(OffsetDateTime.now());
        return memberRepository.save(member);
    }
}
