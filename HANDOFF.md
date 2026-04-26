# HANDOFF.md

**Last updated:** 2026-04-26
**Branch:** main
**Last commit:** 195e807 — pre-commit hook + GitHub Actions CI
**Next session priority:** Credentials unblock → deploy → soft launch

---

## State Right Now

All 6 ROADMAP phases built. App is feature-complete for soft launch pending live credentials. 16 commits on main, 52/52 unit tests passing, pre-commit hook active.

---

## This Loop Shipped

- **HomeScreen**: safe-area insets, tile split (check-in + chevron nav), nudge preview card, squad pulse card, Day 84 modal trigger, domain setup modal trigger
- **ProgressScreen**: 7-day domain dot grid
- **ProgressiveDomainSetupModal**: Days 2-4 progressive domain focus collection
- **Day84CompletionModal**: intro → reflection → celebrate, +50 XP, "Start Cycle 2" → /new-cycle
- **NewCycleScreen**: anchor re-selection, creates new kairos_cycle
- **AdminMetricsPage**: email-gated, metrics_snapshots display, "Compute Now" trigger
- **migration 004**: cycle_reflections with RLS
- **store.completeCycle()**: marks completed, saves reflection, +50 XP, Supabase sync
- **E2E specs**: auth, home, onboarding, setup (Playwright, require live Supabase)
- **Vitest config**: e2e excluded, 52 tests passing
- **YouScreen**: Stripe Customer Portal "Manage billing" link
- **Pre-commit hook**: tsc + voice check (src/ only) + vitest
- **GitHub Actions CI**: type check, voice check, unit tests, build on push/PR

---

## Full Feature Inventory

### Pages (14)
SplashScreen, LoginPage, RegisterPage, OnboardingFlow (Day 0 win), HomeScreen, ProgressScreen, DetailScreen, ImproveScreen, YouScreen, SubscriptionScreen, AdminMetricsPage (/admin/metrics), NewCycleScreen (/new-cycle), PrivacyPolicyPage, TermsServicePage, HelpFAQPage

### Modals (3)
WeeklyVibeCheckModal, ProgressiveDomainSetupModal, Day84CompletionModal

### Edge Functions (7)
generate-kairos-nudge (Claude Haiku), match-to-squad, generate-squad-pulse (Claude Sonnet), stripe-webhook, save-push-subscription, compute-weekly-metrics, delete-account

### Migrations (4)
001 initial schema, 002 streak function, 003 push subscriptions, 004 cycle reflections

### TanStack Query Hooks
useNudge, useUpdateNudgeStatus, useStreaks, useSquadPulse, useMatchToSquad, useDomainCheckIns

---

## Blocked On (Credentials Only)

| Item | Env var / location |
|---|---|
| Supabase URL + anon key | .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Anthropic API key | Supabase Vault: ANTHROPIC_API_KEY |
| Stripe checkout URL | .env: VITE_STRIPE_CHECKOUT_URL |
| Stripe webhook secret | Supabase Vault: STRIPE_WEBHOOK_SECRET |
| Stripe portal URL | .env: VITE_STRIPE_PORTAL_URL |
| VAPID public key | .env: VITE_VAPID_PUBLIC_KEY |
| VAPID private key | Supabase Vault: VAPID_PRIVATE_KEY |
| PWA icons | /public/logo192.png + logo512.png |

---

## Deployment Steps (Once Credentials Available)

1. `cp .env.example .env` and fill in all values
2. `supabase db push` — runs all 4 migrations
3. `supabase secrets set ANTHROPIC_API_KEY=... STRIPE_WEBHOOK_SECRET=... VAPID_PRIVATE_KEY=...`
4. `supabase functions deploy --all`
5. `npm run build`
6. `vercel --prod`

Full guide: DEPLOY.md

---

## Test Status

52/52 unit tests passing. E2E specs written, require live Supabase (marked TODO: VERIFY).
Pre-commit hook active: tsc + voice check + vitest on every commit.
GitHub Actions CI: same checks on push/PR to main.
