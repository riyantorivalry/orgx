package com.orgx.attendance.controller;

import com.orgx.attendance.config.AdminAuthContext;
import com.orgx.attendance.config.AdminAuthFilter;
import com.orgx.attendance.dto.AdminAuthResponse;
import com.orgx.attendance.dto.AdminLoginRequest;
import com.orgx.attendance.service.AdminAuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {
    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/login")
    public ResponseEntity<AdminAuthResponse> login(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletResponse response
    ) {
        String token = adminAuthService.login(request.username(), request.password())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid username or password"));

        Cookie cookie = new Cookie(AdminAuthFilter.COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 12);
        response.addCookie(cookie);

        return ResponseEntity.ok(new AdminAuthResponse(request.username()));
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpServletRequest request, HttpServletResponse response) {
        String token = extractCookie(request, AdminAuthFilter.COOKIE_NAME);
        adminAuthService.logout(token);

        Cookie clear = new Cookie(AdminAuthFilter.COOKIE_NAME, "");
        clear.setHttpOnly(true);
        clear.setSecure(false);
        clear.setPath("/");
        clear.setMaxAge(0);
        response.addCookie(clear);

        return Map.of("message", "Logged out");
    }

    @GetMapping("/me")
    public AdminAuthResponse me(HttpServletRequest request) {
        String token = extractCookie(request, AdminAuthFilter.COOKIE_NAME);
        String username = adminAuthService.resolveUsername(token)
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Unauthorized"));
        request.setAttribute(AdminAuthContext.ADMIN_USERNAME_ATTR, username);
        return new AdminAuthResponse(username);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
