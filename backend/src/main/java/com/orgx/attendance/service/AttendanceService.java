package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceRecord;
import com.orgx.attendance.domain.Member;
import com.orgx.attendance.domain.SessionStatus;
import com.orgx.attendance.domain.SessionToken;
import com.orgx.attendance.repository.AttendanceRecordRepository;
import com.orgx.attendance.repository.MemberRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AttendanceService {
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final TokenService tokenService;
    private final MemberRepository memberRepository;

    public AttendanceService(AttendanceRecordRepository attendanceRecordRepository, TokenService tokenService, MemberRepository memberRepository) {
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.tokenService = tokenService;
        this.memberRepository = memberRepository;
    }

    public String submit(String rawToken, UUID memberId) {
        SessionToken token = tokenService.validateRawToken(rawToken);
        if (token.getSession().getStatus() != SessionStatus.ACTIVE) {
            return "Session is not active";
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(token.getSession().getStartsAt()) || now.isAfter(token.getSession().getEndsAt())) {
            return "Outside attendance window";
        }
        if (attendanceRecordRepository.existsBySession_IdAndMember_Id(token.getSession().getId(), memberId)) {
            return "Attendance already recorded";
        }
        Member member = memberRepository.findById(memberId).orElseThrow();
        AttendanceRecord record = new AttendanceRecord();
        record.setSession(token.getSession());
        record.setMember(member);
        record.setCheckedInAt(OffsetDateTime.now());
        attendanceRecordRepository.save(record);
        return "Attendance recorded";
    }
}
