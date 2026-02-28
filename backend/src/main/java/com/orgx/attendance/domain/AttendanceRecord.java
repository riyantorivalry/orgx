package com.orgx.attendance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "attendance_records", uniqueConstraints = {
        @UniqueConstraint(name = "uk_session_member", columnNames = {"session_id", "member_id"})
})
public class AttendanceRecord {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private AttendanceSession session;

    @ManyToOne(optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false)
    private OffsetDateTime checkedInAt = OffsetDateTime.now();

    @Column(nullable = false, length = 20)
    private String source = "QR_WEB";
}
