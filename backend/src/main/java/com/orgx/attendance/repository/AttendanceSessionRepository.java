package com.orgx.attendance.repository;

import com.orgx.attendance.domain.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, UUID> {
    long countByIsMandatoryTrue();
    long countByIsMandatoryFalse();
}
