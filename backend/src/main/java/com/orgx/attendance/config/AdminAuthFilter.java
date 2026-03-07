package com.orgx.attendance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.orgx.attendance.service.AdminAuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
public class AdminAuthFilter extends OncePerRequestFilter {
    public static final String COOKIE_NAME = "admin_session";

    private final AdminAuthService adminAuthService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AdminAuthFilter(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/admin/") || path.startsWith("/api/admin/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = readCookie(request, COOKIE_NAME);
        String username = adminAuthService.resolveUsername(token).orElse(null);
        if (username == null) {
            response.setStatus(401);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(), Map.of("message", "Unauthorized"));
            return;
        }

        request.setAttribute(AdminAuthContext.ADMIN_USERNAME_ATTR, username);
        filterChain.doFilter(request, response);
    }

    private String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
