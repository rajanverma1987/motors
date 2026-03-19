# Motop Technician (Expo)

Mobile app for shop technicians: sign in with **employee email + password** (same as configured in CRM), scan **RFQ QR tags** printed from the Quotes screen, open work orders, update **status**, and add **comments**.

- **JavaScript only** (no TypeScript).
- **Theme** colors match the MotorsWinding CRM light theme (`src/theme.js` → same HSL tokens as web `globals.css`).

## Prerequisites (CRM)

1. **Employees** → add employee with email, password, and **Technician App access** enabled.
2. **Quotes** → save quote so it has an **RFQ#**, then use **Tag QR** to print the motor tag (QR encodes the RFQ number only).

## API URL

The app calls your Next.js server. Set the base URL in **`.env`** in this folder, then **restart Expo** (stop Metro and run `npx expo start` again — env is baked in at start).

| Where you run the app | Use this `EXPO_PUBLIC_API_URL` |
|------------------------|--------------------------------|
| **iOS Simulator** (Mac) | `http://127.0.0.1:3000` — the simulator uses your Mac’s localhost. Avoid `192.168.x.x` unless your Next server is bound to `0.0.0.0` and the IP is correct. |
| **Android Emulator** | `http://10.0.2.2:3000` — special alias to the host machine. If you set `127.0.0.1`, the app rewrites it to `10.0.2.2` automatically. |
| **Physical phone** | Your computer’s LAN IP, e.g. `http://192.168.1.50:3000`, same Wi‑Fi. Start Next with: `npx next dev --hostname 0.0.0.0` (or your project’s dev script) so it accepts non-localhost connections. |

If login **spins forever**, the request was hanging with no timeout before; now it errors after 20s. Fix the URL above and restart Expo.

## Expo Go vs SDK

This project targets **Expo SDK 54** so it opens in **Expo Go 54.x** from the App Store / Play Store. If you upgrade the repo to SDK 55+, you must use a **development build** (`eas build --profile development`) until the store version of Expo Go catches up.

## Run

```bash
cd motop-technician-app
npm install
npx expo start
```

Then open in **Expo Go** (same major SDK as this project) or a dev build. Camera permission is required for QR scanning.

## Backend routes (main repo)

- `POST /api/tech/auth/login` — employee login; returns JWT + `workOrderStatuses`.
- `GET /api/tech/rfq/:rfq/work-orders` — list work orders for that RFQ (Bearer token).
- `GET /api/tech/motor-serial/:serial/work-orders` — **open** work orders for motors matching that serial (Bearer).
- `GET /api/tech/work-orders/:id` — work order detail.
- `PATCH /api/tech/work-orders/:id` — body: `{ status }` and/or `{ appendNote: "text" }`.

JWT uses the same secret as portal auth (`JWT_SECRET` / `PORTAL_JWT_SECRET`).

## App Store & Play Store + fast updates

See **[STORE_PUBLISH.md](./STORE_PUBLISH.md)** for **EAS Build**, **EAS Submit**, and **EAS Update** (OTA JS updates without waiting for full store review).

### Quick release commands

From `motop-technician-app/`:

| Command | What it does |
|--------|----------------|
| `npm run release:build:android` | EAS production build (Android `.aab`) |
| `npm run release:build:ios` | EAS production build (iOS) |
| `npm run release:build:all` | Both platforms |
| `npm run release:submit:android` | Submit latest Android build to Play |
| `npm run release:submit:ios` | Submit latest iOS build to App Store Connect |
| `npm run release:ota -- --message "Fix login"` | OTA update on `production` channel |

Or run **`./scripts/release.sh`** with the same actions (`build-android`, `ota "msg"`, etc.).

### Push notifications

After login on a **real phone**, the app registers for Expo push and calls `POST /api/tech/push/register`. The CRM sends a notification when a work order is **assigned** or **reassigned** to that employee. **Simulator does not receive push tokens** — test on a device or TestFlight/internal track.
