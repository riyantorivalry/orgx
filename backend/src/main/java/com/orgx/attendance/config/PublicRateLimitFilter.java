package com.orgx.attendance.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class PublicRateLimitFilter extends OncePerRequestFilter {
    private final ConcurrentHashMap<String, WindowCounter> counters = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong(0);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.security.rate-limit.window-seconds:60}")
    private long windowSeconds;

    @Value("${app.security.rate-limit.public-max-requests:120}")
    private int publicMaxRequests;

    @Value("${app.security.rate-limit.attendance-max-requests:20}")
    private int attendanceMaxRequests;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        int maxRequests = maxRequestsFor(request.getMethod(), uri);

        if (maxRequests <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        long windowMillis = Duration.ofSeconds(windowSeconds).toMillis();
        String key = request.getMethod() + "|" + uri + "|" + clientAddress(request) + "|" + userAgent(request);

        WindowCounter counter = counters.computeIfAbsent(key, ignored -> new WindowCounter(now));
        long retryAfterSeconds = 0;
        boolean allowed;

        synchronized (counter) {
            if (now - counter.windowStartMillis >= windowMillis) {
                counter.windowStartMillis = now;
                counter.count = 0;
            }

            if (counter.count >= maxRequests) {
                allowed = false;
                retryAfterSeconds = Math.max(1, (counter.windowStartMillis + windowMillis - now + 999) / 1000);
            } else {
                counter.count++;
                allowed = true;
            }
        }

        cleanupStaleCounters(now, windowMillis);

        if (!allowed) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            objectMapper.writeValue(response.getWriter(), Map.of(
                    "message", "Too many requests. Please try again shortly.",
                    "code", "rate_limited"
            ));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private int maxRequestsFor(String method, String uri) {
        if (!uri.startsWith("/api/public/")) {
            return 0;
        }
        if ("POST".equalsIgnoreCase(method) && "/api/public/attendance".equals(uri)) {
            return attendanceMaxRequests;
        }
        return publicMaxRequests;
    }

    private String clientAddress(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String userAgent(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null || userAgent.isBlank()) {
            return "unknown";
        }
        return userAgent.length() > 200 ? userAgent.substring(0, 200) : userAgent;
    }

    private void cleanupStaleCounters(long now, long windowMillis) {
        long current = requestCount.incrementAndGet();
        if (current % 1000 != 0) {
            return;
        }
        long staleThreshold = now - (windowMillis * 10);
        counters.entrySet().removeIf(entry -> entry.getValue().windowStartMillis < staleThreshold);
    }

    private static class WindowCounter {
        private long windowStartMillis;
        private int count;

        private WindowCounter(long windowStartMillis) {
            this.windowStartMillis = windowStartMillis;
        }
    }
}
