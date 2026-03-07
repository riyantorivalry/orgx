package com.orgx.attendance.dto;

public record AdminMemberAttendanceStatsResponse(
        long mandatoryAttended,
        long mandatoryTotal,
        double mandatoryRatePercent,
        long optionalAttended,
        long optionalTotal,
        double optionalRatePercent
) {
}
