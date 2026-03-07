package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceRecord;
import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.domain.Member;
import com.orgx.attendance.domain.SessionStatus;
import com.orgx.attendance.domain.SessionToken;
import com.orgx.attendance.repository.AttendanceRecordRepository;
import com.orgx.attendance.repository.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;

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

    public SubmitResult submit(String rawToken, UUID memberId) {
        SessionToken token = tokenService.validateRawToken(rawToken);
        AttendanceSession session = token.getSession();
        ensureSessionOpen(session);

        if (attendanceRecordRepository.existsBySession_IdAndMember_Id(session.getId(), memberId)) {
            return new SubmitResult("already_recorded", "Attendance already recorded");
        }

        Member member = memberRepository.findByIdAndActiveTrue(memberId)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Member is not active or not found"));

        AttendanceRecord attendanceRecord = new AttendanceRecord();
        attendanceRecord.setSession(session);
        attendanceRecord.setMember(member);
        attendanceRecord.setCheckedInAt(OffsetDateTime.now());
        attendanceRecord.setSource("QR_WEB");
        attendanceRecordRepository.save(attendanceRecord);

        return new SubmitResult("recorded", "Attendance recorded");
    }

    public void ensureSessionOpen(AttendanceSession session) {
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new ResponseStatusException(FORBIDDEN, "Session is not active");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(session.getStartsAt()) || now.isAfter(session.getEndsAt())) {
            throw new ResponseStatusException(FORBIDDEN, "Outside attendance window");
        }
    }

    public record SubmitResult(String status, String message) {
    }
}
