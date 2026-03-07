package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.domain.SessionStatus;
import com.orgx.attendance.dto.AdminSessionListItemResponse;
import com.orgx.attendance.dto.CreateSessionRequest;
import com.orgx.attendance.repository.AttendanceRecordRepository;
import com.orgx.attendance.repository.AttendanceSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class SessionService {
    private final AttendanceSessionRepository sessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public SessionService(AttendanceSessionRepository sessionRepository, AttendanceRecordRepository attendanceRecordRepository) {
        this.sessionRepository = sessionRepository;
        this.attendanceRecordRepository = attendanceRecordRepository;
    }

    public AttendanceSession create(CreateSessionRequest request, String createdBy) {
        AttendanceSession session = new AttendanceSession();
        session.setEventName(request.eventName());
        session.setStartsAt(request.startsAt());
        session.setEndsAt(request.endsAt());
        session.setCreatedBy(createdBy);
        session.setMandatory(request.mandatory());
        session.setStatus(SessionStatus.DRAFT);
        session.setCreatedAt(OffsetDateTime.now());
        session.setUpdatedBy(createdBy);
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }

    public AttendanceSession start(UUID id, String updatedBy) {
        AttendanceSession session = getRequired(id);
        session.setStatus(SessionStatus.ACTIVE);
        session.setUpdatedBy(updatedBy);
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }

    public AttendanceSession close(UUID id, String updatedBy) {
        AttendanceSession session = getRequired(id);
        session.setStatus(SessionStatus.CLOSED);
        session.setUpdatedBy(updatedBy);
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }

    public AttendanceSession update(UUID id, CreateSessionRequest request, String updatedBy) {
        AttendanceSession session = getRequired(id);
        session.setEventName(request.eventName());
        session.setStartsAt(request.startsAt());
        session.setEndsAt(request.endsAt());
        session.setMandatory(request.mandatory());
        session.setUpdatedBy(updatedBy);
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }

    public void delete(UUID id) {
        AttendanceSession session = getRequired(id);
        if (attendanceRecordRepository.existsBySession_Id(id)) {
            throw new ResponseStatusException(CONFLICT, "Cannot delete session with attendance history");
        }
        sessionRepository.delete(session);
    }

    public AttendanceSession getRequired(UUID id) {
        return sessionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Session not found"));
    }

    public List<AdminSessionListItemResponse> list() {
        return sessionRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(s -> new AdminSessionListItemResponse(
                        s.getId(),
                        s.getEventName(),
                        s.getStartsAt(),
                        s.getEndsAt(),
                        s.isMandatory(),
                        s.getStatus().name(),
                        s.getCreatedBy(),
                        s.getUpdatedBy(),
                        s.getCreatedAt(),
                        s.getUpdatedAt()
                ))
                .toList();
    }
}
