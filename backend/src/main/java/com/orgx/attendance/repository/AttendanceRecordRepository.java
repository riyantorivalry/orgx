package com.orgx.attendance.repository;

import com.orgx.attendance.domain.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    boolean existsBySession_IdAndMember_Id(UUID sessionId, UUID memberId);
}
