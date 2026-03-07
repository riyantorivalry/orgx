package com.orgx.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminSessionDashboardResponse(
        UUID id,
        String eventName,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        boolean mandatory,
        String status,
        long totalCheckIns,
        long totalActiveMembers,
        double checkInRatePercent
) {
}
