package com.orgx.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminMemberAttendanceSessionResponse(
        UUID sessionId,
        String eventName,
        boolean mandatory,
        OffsetDateTime checkedInAt,
        String source,
        String sessionStatus
) {
}
