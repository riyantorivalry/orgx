package com.orgx.attendance.dto;

import java.util.UUID;

public record MemberResponse(UUID id, String memberCode, String fullName, boolean active) {
}
