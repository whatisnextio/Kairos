We are building Kairos — a native mobile app (Capacitor 6 wrapping a vanilla JS PWA) that gives a single daily score 0–100: Training 40%, Recovery 30%, Alcohol-free 20%, Streak bonus 10%.

Repo: https://github.com/whatisnextio/Kairos
Working directory: C:\Users\ldgmc\Documents\Kairos
Branch: main — all PRs merged and deleted (PRs 1–4 done).
Tests: 116 passing. Build: Vite, clean, no warnings.

Read HANDOFF.md for the full current state and remaining tasks.

The next things to build (in priority order):

1. Android release signing in CI — update kairos/android/app/build.gradle with signingConfigs.release reading env vars (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD), update .github/workflows/build-kairos.yml to run assembleRelease on main push, upload signed APK artifact. The Gradle signing snippet is in HANDOFF.md.

2. App icon replacement — the current Android mipmap icons and iOS AppIcon.appiconset are default Capacitor teal. Replace with Kairos orange #ff5a00 K letterform icons at all required densities. Use a Node script or sharp/jimp to generate from a base SVG/canvas.

3. Splash screen — replace default white Capacitor splash with Kairos black (#000000) + orange K. Android: all drawable-*-*/splash.png. iOS: Splash.imageset PNGs.

Rules:
- V2 mode. Sonnet model. Work autonomously.
- All PRs merged and deleted immediately — never leave PRs open.
- All permissions accepted.
- Loop until done. Write HANDOFF.md + NEXT_PROMPT.md when context fills.
- 116 tests must still pass on every commit.
