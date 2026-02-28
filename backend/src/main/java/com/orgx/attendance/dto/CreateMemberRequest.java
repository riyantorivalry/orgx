package com.orgx.attendance.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateMemberRequest(
        @NotBlank String memberCode,
        @NotBlank String fullName,
        boolean active
) {
}
