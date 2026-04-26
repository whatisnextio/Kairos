# Phase 0 File Audit — 12K Legacy Codebase

**Date:** 2026-04-26
**Source:** `12k_transform_populated/`
**Verdict:** 0 of 34 files contain correct, compilable code for their filename.

---

## Summary

| Classification | Count |
|---|---|
| REAL (working code in correct file) | 0 |
| STUB (partial real code, wrong or truncated) | 4 |
| DUPLICATE (wrong content, copy of another file's body) | 25 |
| EMPTY (`// No content found`) | 5 |

**Root cause:** A code-generation/export pipeline serialised content into fixed-size chunks and assigned them to the wrong files. The file-system skeleton (folder structure, filenames) is correct. The content routing is completely broken. 34 files collapse to 7 distinct content bodies.

---

## File-by-File Inventory

| File | Status | Lines | Keep/Rebuild/Delete | Notes |
|---|---|---|---|---|
| `public/index.html` | EMPTY | 0 | Rebuild | `// No content found` sentinel. HTML shell missing entirely. |
| `public/manifest.json` | STUB | 27 | Rebuild | Correct PWA manifest inside `/* */` block comment. Content salvageable. App name, theme colours (#0B0B0B) are right. |
| `public/service-worker.js` | STUB | 9 | Rebuild | Workbox imports inside `/* */`, truncated at 9 lines. Use `vite-plugin-pwa` instead. |
| `serviceWorkerRegistration.ts` | EMPTY | 0 | Rebuild | `// No content found` sentinel. |
| `src/index.tsx` | DUPLICATE | 62 | Rebuild | Identical to `src/App.tsx` and `src/tailwind.css`. Contains Tailwind CSS spec in `/* */`. Zero React bootstrap code. |
| `src/App.tsx` | DUPLICATE | 62 | Rebuild | Same as `src/index.tsx`. CSS in TSX, entirely commented. No router, no auth, no layout shell. |
| `src/tailwind.css` | STUB | 62 | Rebuild | Correct home for this content. Full Tailwind base/component layer spec in `/* */`. Uncomment and use directly — salvageable. |
| `tsconfig.json` | DUPLICATE | 6 | Rebuild | Contains `.env` placeholder variable names in `/* */`. Not valid TSConfig JSON. |
| `tailwind.config.js` | DUPLICATE | 6 | Rebuild | Same `.env` dump as `tsconfig.json`. Font and colour config referenced but no `module.exports`. |
| `src/types/index.ts` | DUPLICATE | 60 | Delete | Contains JSX AI-card render fragment, not TypeScript interfaces. No type definitions salvageable. |
| `src/store/useAppStore.ts` | STUB | 42 | Rebuild | Mid-function fragment of `setDailyCheckIn`. Begins `/* ... as before ... */`. Shows XP constants, optimistic update pattern, Supabase write with tier guard. Useful as implementation reference. |
| `src/services/supabaseClient.ts` | DUPLICATE | 42 | Rebuild | Identical to `useAppStore.ts`. No `createClient()` call. Full rebuild required. |
| `src/utils/gamification.ts` | DUPLICATE | 60 | Delete | Same AI-card JSX body as 14 other files. No XP tables, level logic, or phase logic. |
| `src/components/common/Button.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. No Button component. |
| `src/components/common/Card.tsx` | DUPLICATE | 60 | Delete | Same. No Card component. |
| `src/components/common/Input.tsx` | DUPLICATE | 60 | Delete | Same. No Input component. |
| `src/components/common/Modal.tsx` | DUPLICATE | 60 | Delete | Same. No Modal component. |
| `src/components/layout/BottomTabBar.tsx` | DUPLICATE | 60 | Delete | Same. No tab bar code. |
| `src/components/modals/WeeklyVibeCheckModal.tsx` | DUPLICATE | 6 | Delete | `.env` dump. No modal code. |
| `src/pages/HomeScreen.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. No home screen. |
| `src/pages/ImproveScreen.tsx` | STUB | 60 | Rebuild | This is the file the 60-line AI-card body belongs to — lower section of the AI tab. Shows `AICard` component API, `fetchAiSuggestions`, `acceptAiChallenge`, `completeAiChallenge`, `dismissAiSuggestion`. Use as design reference. |
| `src/pages/ProgressScreen.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. |
| `src/pages/DetailScreen.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. |
| `src/pages/SplashScreen.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. |
| `src/pages/YouScreen.tsx` | DUPLICATE | 6 | Delete | `.env` dump. No profile page. |
| `src/pages/SubscriptionScreen.tsx` | DUPLICATE | 6 | Delete | `.env` dump. |
| `src/pages/PrivacyPolicyPage.tsx` | DUPLICATE | 6 | Delete | `.env` dump. |
| `src/pages/HelpFAQPage.tsx` | EMPTY | 0 | Delete | `// No content found`. |
| `src/pages/TermsServicePage.tsx` | EMPTY | 0 | Delete | `// No content found`. |
| `src/pages/auth/LoginPage.tsx` | EMPTY | 0 | Delete | `// No content found`. |
| `src/pages/auth/RegisterPage.tsx` | EMPTY | 0 | Delete | `// No content found`. |
| `src/pages/onboarding/AnchorStep.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. |
| `src/pages/onboarding/FocusSetupStep.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. |
| `src/pages/onboarding/WelcomeStep.tsx` | DUPLICATE | 60 | Delete | AI-card JSX in wrong file. |

---

## Content Body Fingerprint Map

| Content type | Lines | Files (count) |
|---|---|---|
| AI card JSX fragment (ImproveScreen lower section) | 60 | 15 files |
| Tailwind CSS base/component layer (in `/* */`) | 62 | 3 files |
| `setDailyCheckIn` mid-function (begins `/* ... as before... */`) | 42 | 2 files |
| `.env` template (in `/* */`) | 6 | 7 files |
| `// No content found for this file` | 0 | 5 files |
| PWA manifest JSON (in `/* */`) | 27 | 1 file |
| Workbox service-worker imports (in `/* */`, truncated) | 9 | 1 file |

---

## Key Absences

- **KAIROS phase logic**: zero references to KICKOFF, ANCHOR, INCREASE, RHYTHM, OWN, SUSTAIN anywhere
- **84-day cycle logic**: no day-to-phase mapping, no phase enum, no cycle entity
- **AI API client**: no Anthropic/OpenAI client, no prompt template, no response parser
- **TypeScript types**: no interfaces for Profile, Cycle, CheckIn, Phase, Domain
- **package.json**: missing — no dependency baseline
- **vite.config.ts**: missing
- **Any test files**: zero test infrastructure

---

## Rebuild Estimate

| Area | Effort |
|---|---|
| Project scaffold | 0.5 days |
| TypeScript types | 1 day |
| Supabase schema + RLS | 2 days |
| Zustand store | 2 days |
| KAIROS phase engine | 1.5 days |
| Auth screens | 1 day |
| Onboarding flow | 1.5 days |
| Core UI components | 1 day |
| HomeScreen | 2 days |
| ProgressScreen | 2 days |
| ImproveScreen + AI backend | 5 days |
| YouScreen + Subscription | 1.5 days |
| PWA + service worker | 0.5 days |
| Legal pages | 0.5 days |
| **Total** | **~23 days solo / ~12 days parallelised** |
