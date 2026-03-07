# Phase 4 UAT Checklist

## Setup
1. Start backend and frontend.
2. Create at least one active member.
3. Create a session with an active time window (current time within `starts_at` and `ends_at`).
4. Start the session and issue a token from `POST /api/admin/sessions/{id}/tokens`.
5. Open frontend with `?token=<raw-token>`.

## Security Headers
1. Call any API endpoint (for example `GET /api/public/sessions/by-token/{token}`).
2. Verify response headers include:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: no-referrer`
   - `Permissions-Policy`
   - `Cache-Control: no-store`

## Rate Limiting
1. Send repeated requests to `POST /api/public/attendance` using the same IP and user agent.
2. Verify endpoint returns `429` after exceeding configured threshold.
3. Verify `Retry-After` header is present.
4. Verify normal requests succeed again after the rate-limit window passes.

## Attendance Behavior
1. Submit attendance for a valid active member and valid token.
2. Verify success payload status is `recorded`.
3. Submit again with the same member and token.
4. Verify idempotent payload status is `already_recorded`.
5. Wait until token expires and submit again.
6. Verify response status is `410`.
7. Close session and submit again with a fresh token.
8. Verify response status is `403`.

## Accessibility
1. Open attendance page on mobile viewport.
2. Verify text and buttons are readable without zoom.
3. Verify search input has an accessible label (screen reader).
4. Verify error and success announcements are read by screen reader as live region updates.

## Admin Audit Logging
1. Trigger admin actions:
   - create session
   - start session
   - issue token
   - close session
2. Verify backend logs contain `admin_action` entries with method/path/status/duration/ip.

## Load Smoke Test
1. Install k6.
2. Run:
   ```bash
   k6 run testing/load/k6-public-attendance.js -e BASE_URL=http://localhost:8080 -e TOKEN=<raw-token> -e MEMBER_ID=<member-uuid>
   ```
3. Verify thresholds pass (`http_req_failed` and `http_req_duration`).
