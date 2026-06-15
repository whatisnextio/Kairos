We are building Kairos — a native mobile app (Capacitor 6 wrapping a vanilla JS PWA) that gives a single daily score 0–100: Training 40%, Recovery 30%, Alcohol-free 20%, Streak bonus 10%.

Repo: https://github.com/whatisnextio/Kairos
Working directory: C:\Users\ldgmc\Documents\Kairos
Branch: main — all PRs merged and deleted (PRs 1–5 done).
Tests: 116 passing. Build: Vite, clean, no warnings.

Read HANDOFF.md for the full current state.

## Current CI state

ALL GREEN as of run 27528379003 (2026-06-15):
- Test, Web build, Android APK (debug), iOS IPA (simulator), OTA deploy (graceful skip)
- Android: AGP 8.3.2, Gradle 8.7, compileSdk 35, targetSdk 35, minSdk 23
- FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true set at workflow level

## What's left

The pipeline is complete. Remaining items are all human one-time manual steps:

1. Capgo: capgo.app → create app (appId io.kairos.app) → get API key → add CAPGO_API_KEY as GitHub secret
2. Android signing: keytool -genkey → base64 encode jks → add KEYSTORE_FILE, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD as GitHub secrets
3. iOS signing: Apple Developer account + provisioning profile
4. Google Play listing: download debug APK from CI artifact kairos-apk and upload manually
5. App Store listing: App Store Connect

If there's automated code work to pick up:
- Fastlane Match for iOS signed IPA in CI
- Push notification from Capgo (requires CAPGO_API_KEY set first)
- Real device notification testing

Rules:
- V2 mode. Sonnet model. Work autonomously.
- All PRs merged and deleted immediately.
- All permissions accepted.
- Loop until done. Write HANDOFF.md + NEXT_PROMPT.md when context fills.
- 116 tests must still pass on every commit.
