# Android Mobile App (Separate Codebase)

This folder contains a standalone Android mobile client that mirrors the existing frontend UI/UX style:

- Same color palette and card-based visual system
- Public member check-in flow
- Admin login flow
- Admin operations dashboard (dashboard/sessions/members views)

## Stack

- Expo + React Native + TypeScript

## Configure API Base URL

The app uses:

- `EXPO_PUBLIC_API_BASE_URL`

If not set, it defaults to `http://10.0.2.2:8080` (Android emulator mapping to localhost).

Example (PowerShell):

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:8080"
npm install
npm run android
```

For a real device, point to your machine IP, for example:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.1.20:8080"
```

## Notes

- Admin endpoints rely on backend auth cookies (`credentials: "include"`).
- UI intentionally follows the frontend styling language for consistency.
