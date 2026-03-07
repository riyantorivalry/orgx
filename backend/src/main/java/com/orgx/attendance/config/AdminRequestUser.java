package com.orgx.attendance.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

public final class AdminRequestUser {
    private AdminRequestUser() {
    }

    public static String requireUsername(HttpServletRequest request) {
        Object username = request.getAttribute(AdminAuthContext.ADMIN_USERNAME_ATTR);
        if (username instanceof String value && !value.isBlank()) {
            return value;
        }
        throw new ResponseStatusException(UNAUTHORIZED, "Unauthorized");
    }
}
