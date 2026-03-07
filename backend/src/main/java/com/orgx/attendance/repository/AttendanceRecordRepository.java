package com.orgx.attendance.repository;

import com.orgx.attendance.domain.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    boolean existsBySession_IdAndMember_Id(UUID sessionId, UUID memberId);
    boolean existsBySession_Id(UUID sessionId);
    boolean existsByMember_Id(UUID memberId);
    long countBySession_Id(UUID sessionId);
    List<AttendanceRecord> findBySession_IdOrderByCheckedInAtAsc(UUID sessionId);
    List<AttendanceRecord> findByMember_IdOrderByCheckedInAtDesc(UUID memberId);
}
