package com.orgx.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PublicSessionResponse(
        UUID id,
        String eventName,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        String status,
        OffsetDateTime tokenExpiresAt
) {
}
