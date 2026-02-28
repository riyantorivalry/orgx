package com.orgx.attendance.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TokenResponse(UUID sessionId, String token, OffsetDateTime expiresAt) {
}
