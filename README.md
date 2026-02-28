# OrgX Attendance App

Initial implementation scaffold for a QR-based attendance system:

- **Backend:** Spring Boot 3 + Liquibase + JPA
- **Frontend:** React + Vite + TypeScript

## Requirements captured
- Browser-based attendance (no mobile app required)
- No member login for check-in
- Event/session window: 2-3 hours
- QR token expiry: 5 minutes
- Member data is manually maintained by admin (CRUD)

## Run backend
```bash
cd backend
mvn spring-boot:run
```

## Run frontend
```bash
cd frontend
npm install
npm run dev
```
