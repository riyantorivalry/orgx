package com.orgx.attendance.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminMemberResponse(
        UUID id,
        String memberCode,
        String fullName,
        boolean active,
        String createdBy,
        String updatedBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        LocalDate dob,
        String bloodType,
        String address,
        String email,
        String mobileNumber
) {
}
