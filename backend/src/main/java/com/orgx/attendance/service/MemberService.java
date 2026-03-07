package com.orgx.attendance.service;

import com.orgx.attendance.domain.Member;
import com.orgx.attendance.dto.CreateMemberRequest;
import com.orgx.attendance.repository.AttendanceRecordRepository;
import com.orgx.attendance.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.CONFLICT;

@Service
public class MemberService {
    private final MemberRepository memberRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public MemberService(MemberRepository memberRepository, AttendanceRecordRepository attendanceRecordRepository) {
        this.memberRepository = memberRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
    }

    public Member create(CreateMemberRequest request, String createdBy) {
        Member member = new Member();
        member.setMemberCode(generateMemberCode());
        member.setFullName(request.fullName());
        member.setActive(request.active());
        member.setCreatedBy(createdBy);
        member.setUpdatedBy(createdBy);
        member.setDob(request.dob());
        member.setBloodType(normalizeBloodType(request.bloodType()));
        member.setAddress(request.address());
        member.setEmail(normalizeEmail(request.email()));
        member.setMobileNumber(normalizeMobileNumber(request.mobileNumber()));
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

    public Member update(UUID id, CreateMemberRequest request, String updatedBy) {
        Member member = getRequired(id);
        member.setFullName(request.fullName());
        member.setActive(request.active());
        member.setDob(request.dob());
        member.setBloodType(normalizeBloodType(request.bloodType()));
        member.setAddress(request.address());
        member.setEmail(normalizeEmail(request.email()));
        member.setMobileNumber(normalizeMobileNumber(request.mobileNumber()));
        member.setUpdatedBy(updatedBy);
        member.setUpdatedAt(OffsetDateTime.now());
        return memberRepository.save(member);
    }

    public List<Member> searchForAdmin(String query, boolean includeInactive) {
        List<Member> members = memberRepository.findAll().stream()
                .sorted((a, b) -> a.getFullName().compareToIgnoreCase(b.getFullName()))
                .toList();

        return members.stream()
                .filter(member -> includeInactive || member.isActive())
                .filter(member -> query == null || query.isBlank()
                        || member.getFullName().toLowerCase().contains(query.toLowerCase())
                        || member.getMemberCode().toLowerCase().contains(query.toLowerCase()))
                .toList();
    }

    public Member getRequired(UUID id) {
        return memberRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Member not found"));
    }

    public void delete(UUID id) {
        Member member = getRequired(id);
        if (attendanceRecordRepository.existsByMember_Id(id)) {
            throw new ResponseStatusException(CONFLICT, "Cannot delete member with attendance history");
        }
        memberRepository.delete(member);
    }

    private String generateMemberCode() {
        int sequence = (int) memberRepository.count() + 1;
        for (int i = 0; i < 1000; i++) {
            String code = "MBR-" + String.format("%05d", sequence + i);
            if (!memberRepository.existsByMemberCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Failed to generate unique member code");
    }

    private String normalizeBloodType(String bloodType) {
        if (bloodType == null) {
            return null;
        }
        String trimmed = bloodType.trim().toUpperCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeMobileNumber(String mobileNumber) {
        if (mobileNumber == null) {
            return null;
        }
        String trimmed = mobileNumber.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
