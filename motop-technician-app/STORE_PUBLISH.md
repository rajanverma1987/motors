# Publishing to Google Play & App Store + fast updates

Your app is **Expo (managed)**. The standard path is **Expo Application Services (EAS)**:

1. **EAS Build** — cloud builds for `.aab` (Android) and `.ipa` (iOS).
2. **EAS Submit** — upload to Play Console / App Store Connect.
3. **EAS Update** — push **JavaScript/UI changes in minutes** without waiting for store review (OTA). Native changes still need a new store build.

---

## 1. Accounts & one-time setup

| Platform | What you need |
|----------|----------------|
| **Apple** | [Apple Developer Program](https://developer.apple.com/programs/) (~$99/year). App Store Connect access. |
| **Google** | [Google Play Console](https://play.google.com/console) (one-time ~$25). |
| **Expo** | Free account at [expo.dev](https://expo.dev); paid EAS plan if you exceed free build minutes. |

Install CLI (project root = `motop-technician-app`):

```bash
npm install -g eas-cli
eas login
eas init
```

`eas init` links the project and writes `extra.eas.projectId` into `app.config.js` — **commit that**.

---

## 2. Production API URL (critical)

Store builds must **not** use `localhost`. Set your **public HTTPS** CRM URL when building:

**Option A — EAS secrets / build profile env** (recommended):

In `eas.json` under `build.production.env`:

```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://your-motop-crm.com"
}
```

**Option B — EAS Secret** (keeps URL out of git):

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://your-motop-crm.com --type string
```

Then reference it in `eas.json` per [EAS Environment variables](https://docs.expo.dev/build-reference/variables/).

---

## 3. `eas.json` (add if missing)

Example:

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://REPLACE_ME"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- **Android store:** use **AAB** (default for `production`), not APK.
- **preview** + APK is handy for internal testers before store submission.

---

## 4. Build store binaries

```bash
cd motop-technician-app

# iOS (needs Apple credentials; EAS can manage certs)
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Both
eas build --platform all --profile production
```

First time, EAS will ask about credentials; choosing **“Let Expo handle it”** is easiest.

---

## 5. Submit to stores

After a successful build:

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

You still complete **listing, privacy, screenshots, and review** in **App Store Connect** and **Google Play Console** (Expo doesn’t replace that).

---

## 6. Push updates quickly (EAS Update / OTA)

**What OTA can update:** JS/React code, images, most JS-only dependencies — **without** a new Play/App Store binary.

**What still needs a new `eas build`:** Native modules, Expo SDK upgrade, `app.config` changes that affect native code, new permissions, etc.

### Enable updates

```bash
cd motop-technician-app
npx expo install expo-updates
```

In `app.config.js`, after `eas init`, ensure EAS Update is configured (Expo’s `eas update:configure` can add channels). Typical pattern:

- **`runtimeVersion`** — ties OTA updates to compatible native binaries ([policy](https://docs.expo.dev/eas-update/runtime-versions/)).
- **Channels** — e.g. `production`; production builds subscribe to `production`.

Run:

```bash
eas update:configure
```

Follow prompts; commit changes.

### Publish an OTA update

```bash
eas update --channel production --message "Fix work order save"
```

Or: `npm run release:ota -- --message "…"` / `./scripts/release.sh ota "…"` from `motop-technician-app/`.  
**Important:** plain `eas update` uses your local `.env` — if that is `localhost`, the OTA cannot log in on a phone. `npm run release:ota` injects the URL from `eas.json` `build.production.env` first.

(Exact flags depend on your channel setup; `eas update --help` and [EAS Update docs](https://docs.expo.dev/eas-update/introduction/).)

Users get the new JS bundle on next app open (with configurable behavior).

---

## 7. Versioning (stores)

- Bump **`version`** in `app.config.js` / `package.json` for **user-visible** version.
- **Android:** `versionCode` must increase every Play upload.
- **iOS:** build number must increase every upload.

Expo can auto-increment with `eas.json` → `autoIncrement` — see [Expo versioning](https://docs.expo.dev/build-reference/app-versions/).

---

## 8. Checklist before first submission

- [ ] `EXPO_PUBLIC_API_URL` is **HTTPS** production URL in **production** builds.
- [ ] CRM allows your app (CORS less relevant for native; ensure API reachable publicly).
- [ ] Privacy policy URL (stores often require it).
- [ ] App icons / splash (already in `assets/`).
- [ ] Camera permission strings (already in `app.config.js` for QR).

---

## Useful links

- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Store review guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play policies](https://play.google.com/about/developer-content-policy/)
