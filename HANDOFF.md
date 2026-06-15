# Kairos — Handoff

**Date:** 2026-06-15
**Branch:** main (all PRs merged and deleted — PRs 1, 2, 3, 4)
**Repo:** https://github.com/whatisnextio/Kairos
**Last commit:** 0c516d6 — fix(kairos): notification channels, colors.xml, branded colours
**Tests:** 116 passing (50 Kairos + 66 main app). Build: clean, no warnings.

---

## What is done

### Phase 1 — PWA (merged in PR #1)
- `kairos/` — vanilla JS PWA, score 0–100 (Training 40% / Recovery 30% / Alcohol-free 20% / Streak bonus 10%)
- Personal bests card, 7-day trend SVG chart, history log, data export/import (JSON)
- Service worker with cache versioning, manifest, icons in `public/`

### Phase 2 — Capacitor 6 + native builds (PRs #2, #3, #4)
- `kairos/package.json` — standalone npm package, `type: "module"`, Vite build, Vitest
- `kairos/vite.config.js` — bundles bare npm imports to `dist/`
- `kairos/capacitor.config.json` — appId `io.kairos.app`, webDir `dist`, Capgo autoUpdate true
- `kairos/delivery.js` — all Capacitor side-effects: `initChannels()`, `checkPermission()`, `requestPermission()`, `scheduleReminders(state)`, `cancelReminders()`, `notify(title, body, tag)`
  - Schedules 7 days ahead at 06:30 / 12:30 / 20:00 using OS-level LocalNotifications
  - Channel IDs: `kairos-reminders` (HIGH importance) and `kairos-events` (DEFAULT)
  - Falls back to Web Notifications API if LocalNotifications throws (PWA web path)
- `kairos/notifications.js` — pure message builders only, no DOM/native deps, fully unit-tested
- `kairos/android/` — Capacitor 6 Android project: Gradle wrapper, `ic_stat_kairos.xml` icon, notification permissions in manifest (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`), `colors.xml` (#ff5a00 primary)
- `kairos/ios/` — Capacitor 6 iOS project: `NSUserNotificationsUsageDescription` in Info.plist
- `.github/workflows/build-kairos.yml` — 5-job pipeline: test → web build → Android debug APK → iOS sim build → Capgo OTA (main only)

---

## What remains before full production deploy

### One-time manual steps (requires human action)

1. **Capgo account** — capgo.app → create app with appId `io.kairos.app` → copy API key → add as `CAPGO_API_KEY` in https://github.com/whatisnextio/Kairos/settings/secrets/actions
2. **Android release signing** — generate keystore: `keytool -genkey -v -keystore kairos.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kairos` → add `KEYSTORE_FILE` (base64), `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` as GitHub secrets → update Gradle signing config (below)
3. **iOS signing** — Apple Developer account ($99/yr), provisioning profile, signing cert. Use Fastlane Match or Xcode on Mac.
4. **Google Play listing** — create listing, upload first debug/release APK manually
5. **App Store listing** — create listing in App Store Connect

### Automated tasks still to build (next session picks these up)

6. **Android release build in CI** — update `build-kairos.yml`: add signing step, change `assembleDebug` → `assembleRelease`, upload signed APK as artifact
7. **App icon** — replace default Capacitor teal icon with Kairos orange K at all densities (Android: mipmap-*, iOS: AppIcon.appiconset all sizes)
8. **Splash screen** — replace default white with Kairos black `#000000` + orange K

### Gradle signing config (for task 6)

In `kairos/android/app/build.gradle`, inside `android {}`:
```groovy
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.jks")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias System.getenv("KEY_ALIAS")
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

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
  android/                 Capacitor Android project
  ios/                     Capacitor iOS project
  tests/                   score, notifications, storage test suites

.github/workflows/
  build-kairos.yml         Kairos CI/CD (5 jobs)
  ci.yml                   main 12K app CI
```
