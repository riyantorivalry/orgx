package com.orgx.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminSessionListItemResponse(
        UUID id,
        String eventName,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        boolean mandatory,
        String status,
        String createdBy,
        String updatedBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
