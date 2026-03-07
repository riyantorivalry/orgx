package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceRecord;
import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.dto.AdminAttendanceRecordResponse;
import com.orgx.attendance.dto.AdminMemberAttendanceSessionResponse;
import com.orgx.attendance.dto.AdminMemberAttendanceStatsResponse;
import com.orgx.attendance.dto.AdminSessionDashboardResponse;
import com.orgx.attendance.repository.AttendanceSessionRepository;
import com.orgx.attendance.repository.AttendanceRecordRepository;
import com.orgx.attendance.repository.MemberRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AdminMonitoringService {
    private final SessionService sessionService;
    private final MemberService memberService;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final MemberRepository memberRepository;

    public AdminMonitoringService(
            SessionService sessionService,
            MemberService memberService,
            AttendanceSessionRepository attendanceSessionRepository,
            AttendanceRecordRepository attendanceRecordRepository,
            MemberRepository memberRepository
    ) {
        this.sessionService = sessionService;
        this.memberService = memberService;
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
        this.memberRepository = memberRepository;
    }

    public AdminSessionDashboardResponse dashboard(UUID sessionId) {
        AttendanceSession session = sessionService.getRequired(sessionId);
        long totalCheckIns = attendanceRecordRepository.countBySession_Id(sessionId);
        long totalActiveMembers = memberRepository.countByActiveTrue();
        double rate = totalActiveMembers == 0 ? 0.0 : (100.0 * totalCheckIns) / totalActiveMembers;

        return new AdminSessionDashboardResponse(
                session.getId(),
                session.getEventName(),
                session.getStartsAt(),
                session.getEndsAt(),
                session.isMandatory(),
                session.getStatus().name(),
                totalCheckIns,
                totalActiveMembers,
                Math.round(rate * 100.0) / 100.0
        );
    }

    public List<AdminAttendanceRecordResponse> attendanceList(UUID sessionId) {
        sessionService.getRequired(sessionId);
        List<AttendanceRecord> records = attendanceRecordRepository.findBySession_IdOrderByCheckedInAtAsc(sessionId);

        return records.stream()
                .map(r -> new AdminAttendanceRecordResponse(
                        r.getId(),
                        r.getMember().getId(),
                        r.getMember().getMemberCode(),
                        r.getMember().getFullName(),
                        r.getCheckedInAt(),
                        r.getSource()
                ))
                .toList();
    }

    public String exportCsv(UUID sessionId) {
        AdminSessionDashboardResponse dashboard = dashboard(sessionId);
        List<AdminAttendanceRecordResponse> rows = attendanceList(sessionId);

        StringBuilder csv = new StringBuilder();
        csv.append("session_id,event_name,status,starts_at,ends_at,total_check_ins,total_active_members,check_in_rate_percent\n");
        csv.append(csv(dashboard.id().toString())).append(",")
                .append(csv(dashboard.eventName())).append(",")
                .append(csv(dashboard.status())).append(",")
                .append(csv(dashboard.startsAt().toString())).append(",")
                .append(csv(dashboard.endsAt().toString())).append(",")
                .append(dashboard.totalCheckIns()).append(",")
                .append(dashboard.totalActiveMembers()).append(",")
                .append(dashboard.checkInRatePercent()).append("\n\n");

        csv.append("record_id,member_id,member_code,member_name,checked_in_at,source\n");
        for (AdminAttendanceRecordResponse row : rows) {
            csv.append(csv(row.id().toString())).append(",")
                    .append(csv(row.memberId().toString())).append(",")
                    .append(csv(row.memberCode())).append(",")
                    .append(csv(row.memberName())).append(",")
                    .append(csv(row.checkedInAt().toString())).append(",")
                    .append(csv(row.source())).append("\n");
        }
        return csv.toString();
    }

    private String csv(String value) {
        if (value == null) {
            return "\"\"";
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    public List<AdminMemberAttendanceSessionResponse> memberAttendanceSessions(UUID memberId) {
        memberService.getRequired(memberId);
        List<AttendanceRecord> records = attendanceRecordRepository.findByMember_IdOrderByCheckedInAtDesc(memberId);
        return records.stream()
                .map(r -> new AdminMemberAttendanceSessionResponse(
                        r.getSession().getId(),
                        r.getSession().getEventName(),
                        r.getSession().isMandatory(),
                        r.getCheckedInAt(),
                        r.getSource(),
                        r.getSession().getStatus().name()
                ))
                .toList();
    }

    public AdminMemberAttendanceStatsResponse memberAttendanceStats(UUID memberId) {
        memberService.getRequired(memberId);
        List<AttendanceRecord> records = attendanceRecordRepository.findByMember_IdOrderByCheckedInAtDesc(memberId);

        long mandatoryAttended = records.stream().filter(r -> r.getSession().isMandatory()).count();
        long optionalAttended = records.stream().filter(r -> !r.getSession().isMandatory()).count();
        long mandatoryTotal = attendanceSessionRepository.countByIsMandatoryTrue();
        long optionalTotal = attendanceSessionRepository.countByIsMandatoryFalse();

        double mandatoryRate = mandatoryTotal == 0 ? 0.0 : (100.0 * mandatoryAttended) / mandatoryTotal;
        double optionalRate = optionalTotal == 0 ? 0.0 : (100.0 * optionalAttended) / optionalTotal;

        return new AdminMemberAttendanceStatsResponse(
                mandatoryAttended,
                mandatoryTotal,
                Math.round(mandatoryRate * 100.0) / 100.0,
                optionalAttended,
                optionalTotal,
                Math.round(optionalRate * 100.0) / 100.0
        );
    }
}
