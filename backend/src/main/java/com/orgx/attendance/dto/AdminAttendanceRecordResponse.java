package com.orgx.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminAttendanceRecordResponse(
        UUID id,
        UUID memberId,
        String memberCode,
        String memberName,
        OffsetDateTime checkedInAt,
        String source
) {
}
