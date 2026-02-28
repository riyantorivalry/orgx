package com.orgx.attendance.service;

import com.orgx.attendance.domain.AttendanceSession;
import com.orgx.attendance.domain.SessionStatus;
import com.orgx.attendance.dto.CreateSessionRequest;
import com.orgx.attendance.repository.AttendanceSessionRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class SessionService {
    private final AttendanceSessionRepository sessionRepository;

    public SessionService(AttendanceSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    public AttendanceSession create(CreateSessionRequest request) {
        AttendanceSession session = new AttendanceSession();
        session.setEventName(request.eventName());
        session.setStartsAt(request.startsAt());
        session.setEndsAt(request.endsAt());
        session.setCreatedBy(request.createdBy());
        session.setStatus(SessionStatus.DRAFT);
        session.setCreatedAt(OffsetDateTime.now());
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }

    public AttendanceSession start(UUID id) {
        AttendanceSession session = sessionRepository.findById(id).orElseThrow();
        session.setStatus(SessionStatus.ACTIVE);
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }

    public AttendanceSession close(UUID id) {
        AttendanceSession session = sessionRepository.findById(id).orElseThrow();
        session.setStatus(SessionStatus.CLOSED);
        session.setUpdatedAt(OffsetDateTime.now());
        return sessionRepository.save(session);
    }
}
