package com.orgx.attendance.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record CreateMemberRequest(
        @NotBlank String fullName,
        LocalDate dob,
        @Pattern(regexp = "^$|^(?i)(A|B|AB|O)[+-]?$", message = "bloodType must be A, B, AB, O with optional +/-")
        String bloodType,
        String address,
        @Email(message = "email must be a valid email address")
        String email,
        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{6,20}$", message = "mobileNumber format is invalid")
        String mobileNumber,
        boolean active
) {
}
