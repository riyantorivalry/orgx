# Attendance Web App Plan (Spring Boot + React)

## 1) Scope and Goal
Build a low-friction attendance module for organizations where members can record attendance by scanning a QR code and selecting their name in a web browser (no app install, no login).

### Primary outcomes
- Fast attendance flow suitable for elderly members.
- Secure enough for public usage without authentication.
- Time-bounded attendance sessions per event.

### Constraints from requirements
- Platform: Web browser only.
- Authentication: No login for member attendance.
- Attendance event window: 2–3 hours.
- QR token expiry: 5 minutes.
- Roles: Admin/Pengurus and Member/Public User.

---

## 2) Product Features (MVP)

### Admin / Pengurus
1. Create event/session (name, date/time, attendance window).
2. Start attendance session.
3. Generate and display QR code for current session.
4. Refresh QR token automatically every 5 minutes.
5. View real-time attendance list.
6. Close session manually (or auto-close at end time).
7. Export attendance (CSV).

### Member / Public User
1. Scan QR code with phone camera.
2. Open attendance page.
3. Select name from member list (or search).
4. Submit attendance.
5. Receive success/failure confirmation.

---

## 3) High-Level Architecture

### Frontend (React)
- **Admin Portal**
  - Session management UI.
  - QR display screen (full screen mode for projector).
  - Attendance monitor dashboard.
- **Public Attendance Page**
  - Lightweight page optimized for mobile browsers.
  - Name search + one-tap submit.

### Backend (Spring Boot)
- REST API for sessions, tokens, members, attendance records.
- Token service for issuing and validating short-lived QR tokens.
- Attendance service for idempotent check-in handling.
- Reporting/export service.

### Data Store
- PostgreSQL recommended (stable relational reporting).
- Redis optional for token/cache acceleration (can start without Redis for MVP).

### Deployment
- Backend and frontend deployed separately.
- Nginx reverse proxy + HTTPS.
- Dockerized services for reproducible deployment.

---

## 4) Core Data Model (Draft)

### `members`
- `id` (UUID)
- `member_code` (unique)
- `full_name`
- `active` (boolean)
- `created_at`, `updated_at`

### `attendance_sessions`
- `id` (UUID)
- `event_name`
- `starts_at`
- `ends_at`
- `status` (`DRAFT`, `ACTIVE`, `CLOSED`)
- `created_by`
- `created_at`, `updated_at`

### `session_tokens`
- `id` (UUID)
- `session_id` (FK)
- `token_hash` (store hash, not raw token)
- `issued_at`
- `expires_at` (5 min)
- `revoked` (boolean)

### `attendance_records`
- `id` (UUID)
- `session_id` (FK)
- `member_id` (FK)
- `checked_in_at`
- `source` (`QR_WEB`)
- `ip_address` (optional)
- `user_agent` (optional)
- unique constraint: (`session_id`, `member_id`) to prevent duplicates

---

## 5) API Design (MVP)

### Admin endpoints
- `POST /api/admin/sessions` → create session
- `POST /api/admin/sessions/{id}/start` → start session
- `POST /api/admin/sessions/{id}/close` → close session
- `GET /api/admin/sessions/{id}` → session detail + stats
- `GET /api/admin/sessions/{id}/attendance` → attendance list
- `GET /api/admin/sessions/{id}/export.csv` → CSV export
- `POST /api/admin/sessions/{id}/tokens` → issue 5-min QR token

### Public endpoints
- `GET /api/public/sessions/by-token/{token}` → validate token and return session summary
- `GET /api/public/sessions/{id}/members?query=` → searchable members list
- `POST /api/public/attendance` → submit attendance `{token, memberId}`

### Response behavior
- Duplicate submit returns success with message “already recorded” (idempotent UX).
- Expired/invalid token returns `401/410` with instruction to rescan QR.
- Closed/out-of-window session returns `403`.

---

## 6) Security & Abuse Prevention (No Login Scenario)
1. Signed random token (high entropy) with 5-minute expiry.
2. Store only token hash in DB.
3. Rate limit attendance submits per IP/device fingerprint.
4. CSRF disabled only on tokenized public endpoint if stateless; keep secure defaults elsewhere.
5. Strict CORS allowlist for frontend domains.
6. HTTPS mandatory.
7. Audit log for admin actions.

---

## 7) UX Notes for Elderly-Friendly Flow
1. Large tap targets and fonts.
2. Minimal fields: only name selection + submit button.
3. High-contrast colors.
4. Clear status text: “Success”, “Already checked in”, “Token expired”.
5. Search assists with partial name matching.
6. Optional “recent names” shortcut for repeated events.

---

## 8) Attendance Session Logic

1. Admin starts session (`ACTIVE`) with start/end times (2–3 hours).
2. QR token is generated every 5 minutes:
   - Either auto-refresh display timer in admin UI.
   - Old tokens remain invalid after expiry.
3. Member uses current token to access page.
4. Attendance submission valid only when:
   - Session is `ACTIVE`.
   - Current time within session window.
   - Token valid and not expired/revoked.
5. Record inserted if member not yet checked in.
6. Session auto-closes when `ends_at` passes (scheduled job) or manual close.

---

## 9) Suggested Tech Stack

### Backend
- Java 21
- Spring Boot 3.x
- Spring Web, Spring Data JPA, Spring Security
- PostgreSQL
- Liquibase for schema migrations
- Lombok + MapStruct (optional)

### Frontend
- React + TypeScript
- Vite
- React Router
- TanStack Query (API state)
- Tailwind CSS or MUI (accessible UI)

### Ops
- Docker + Docker Compose
- GitHub Actions CI (build/test/lint)

---

## 10) Delivery Plan (Phased)

### Phase 1 — Foundation (Week 1)
- Initialize Spring Boot + React repos.
- Define DB schema and migrations.
- Basic admin session CRUD.

### Phase 2 — QR Attendance Flow (Week 2)
- Token generation/validation.
- Public member selection page.
- Attendance submission with dedupe logic.

### Phase 3 — Admin Monitoring & Export (Week 3)
- Real-time attendance list.
- Session dashboard + counts.
- CSV export.

### Phase 4 — Hardening & UAT (Week 4)
- Rate limiting and security headers.
- Accessibility and elderly-focused UX polish.
- Load test and user acceptance testing.

---

## 11) Acceptance Criteria
1. Admin can start a session and generate QR token.
2. Token expires after 5 minutes and invalid token is rejected.
3. Member can check in without login via name selection.
4. One member can only be recorded once per session.
5. Session only accepts submissions during active window.
6. Admin can monitor attendance and export CSV.

---

## 12) Risks & Mitigations
1. **Name collisions (same full name)**
   - Use additional identifier (member code) in selection UI.
2. **Public endpoint abuse**
   - Apply rate limits + anomaly monitoring.
3. **Poor network at venue**
   - Keep payload lightweight and use simple UI.
4. **QR not visible/scannable**
   - High-contrast QR display and large size on admin screen.

---

## 13) Next Actions
1. Member list is manually maintained in admin module (CRUD feature included in scope).
2. Confirm if admins require authentication (recommended).
3. Approve MVP scope and timeline.
4. Start implementation with Phase 1 scaffolding.
