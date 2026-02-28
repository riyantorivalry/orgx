package com.orgx.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AttendanceSubmitRequest(
        @NotBlank String token,
        @NotNull UUID memberId
) {
}
