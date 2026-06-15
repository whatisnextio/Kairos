# Kairos — Handoff

**Date:** 2026-06-15
**Branch:** main (all PRs merged and deleted — PRs 1–5)
**Repo:** https://github.com/whatisnextio/Kairos
**Last commit:** 1e3a80a — fix(ci): opt into Node.js 24 action runners
**Tests:** 116 passing (50 Kairos + 66 main app). Build: clean.

---

## CI status — ALL GREEN

Run 27528379003 (latest dispatch) and the main push trigger:
- Test — PASS
- Web build — PASS
- Android APK (debug) — PASS
- iOS IPA (simulator unsigned) — PASS
- OTA deploy (Capgo) — SKIPPED gracefully when CAPGO_API_KEY not set

---

## What is done

### Phase 1 — PWA (PR #1)
- `kairos/` — vanilla JS PWA, score 0–100 (Training 40% / Recovery 30% / Alcohol-free 20% / Streak bonus 10%)
- Personal bests card, 7-day trend SVG chart, history log, data export/import (JSON)
- Service worker with cache versioning, manifest, icons in `public/`

### Phase 2 — Capacitor 6 + native builds (PRs #2–5)
- `kairos/package.json` — standalone npm package, `type: "module"`, Vite build, Vitest
- `kairos/vite.config.js` — bundles bare npm imports to `dist/`
- `kairos/capacitor.config.json` — appId `io.kairos.app`, webDir `dist`, Capgo autoUpdate true
- `kairos/delivery.js` — all Capacitor side-effects: `initChannels()`, `checkPermission()`, `requestPermission()`, `scheduleReminders(state)`, `cancelReminders()`, `notify(title, body, tag)`
  - Schedules 7 days ahead at 06:30 / 12:30 / 20:00 using OS-level LocalNotifications
  - Channel IDs: `kairos-reminders` (HIGH importance) and `kairos-events` (DEFAULT)
  - Falls back to Web Notifications API if LocalNotifications throws (PWA web path)
- `kairos/notifications.js` — pure message builders only, no DOM/native deps, fully unit-tested
- `kairos/android/` — Capacitor 6 Android project
  - AGP 8.3.2, Gradle 8.7, compileSdk 35, targetSdk 35, minSdk 23
  - `ic_stat_kairos.xml` notification tray icon (white K letterform)
  - `colors.xml` (#ff5a00 primary)
  - Permissions: POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, WAKE_LOCK, RECEIVE_BOOT_COMPLETED
  - Release signing reads from env vars (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD) — only activates when all four are present
- `kairos/ios/` — Capacitor 6 iOS project
  - `NSUserNotificationsUsageDescription` in Info.plist
- `kairos/scripts/gen-icons.js` — generates 1024×1024 icon + 2732×2732 splash from SVG via sharp, then calls `@capacitor/assets generate` to produce all Android mipmap densities and iOS AppIcon sizes
- `.github/workflows/build-kairos.yml` — 5-job pipeline
  - `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` — proactive Node 24 opt-in
  - Secrets in `if:` replaced with `env.KEYSTORE_B64` approach (GitHub doesn't allow `secrets.*` in if conditions)
  - Capgo step: shell conditional, exits 0 when key not set
  - Android: assembleRelease when keystore present on main, assembleDebug otherwise

---

## What remains before full production deploy

### One-time manual steps (requires human action)

1. **Capgo account** — capgo.app → create app with appId `io.kairos.app` → copy API key → add as `CAPGO_API_KEY` in https://github.com/whatisnextio/Kairos/settings/secrets/actions
2. **Android release signing** — generate keystore: `keytool -genkey -v -keystore kairos.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kairos` → base64-encode it: `base64 kairos.jks` → add `KEYSTORE_FILE` (base64 string), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` as GitHub secrets
3. **iOS signing** — Apple Developer account ($99/yr), provisioning profile, signing cert. Use Fastlane Match or Xcode on Mac.
4. **Google Play listing** — create listing, upload first release APK manually
5. **App Store listing** — create listing in App Store Connect

### Potential next automated tasks

6. **Capgo bundle version** — once CAPGO_API_KEY is set, the OTA job will auto-deploy on every push to main
7. **iOS signed IPA in CI** — requires Apple Dev cert secrets added to GitHub Actions (complex — Fastlane Match recommended)
8. **Verify notifications on real device** — the notification channels and scheduling are implemented; needs physical Android/iOS to confirm

---

## File map

```
kairos/
  app.js                   main UI controller
  delivery.js              Capacitor notifications (init, schedule, cancel, notify)
  notifications.js         pure message builders (tested in Node)
  score.js                 score model
  storage.js               localStorage CRUD + export/import
  index.html               single-page shell
  styles.css               all CSS
  vite.config.js           Vite + Vitest config
  postcss.config.js        empty — stops root tailwind.config.ts leaking in
  capacitor.config.json    Capacitor + Capgo config
  package.json             standalone npm package
  public/                  sw.js, manifest, icons
  android/                 Capacitor Android project (AGP 8.3.2 / Gradle 8.7 / compileSdk 35 / minSdk 23)
  ios/                     Capacitor iOS project
  scripts/gen-icons.js     icon + splash generation script
  tests/                   score, notifications, storage test suites

.github/workflows/
  build-kairos.yml         Kairos CI/CD (5 jobs — all green)
  ci.yml                   main 12K app CI
```
