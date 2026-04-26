# HANDOFF.md

**Last updated:** 2026-04-26
**Branch:** main (25 commits ahead of origin)
**Last commit:** ea2949b — Add pb-safe utility class for iOS bottom bar safe area inset
**Next session priority:** Credentials unblock → deploy to Vercel → soft launch

---

## State Right Now

App is feature-complete for soft launch. 52/52 unit tests passing, TypeScript clean, build clean (66 kB main bundle). Pre-commit hook active. All 8 bug fixes from the loop session committed.

---

## This Loop Shipped (loop session 2026-04-26)

- **AbandonCycleModal**: 2-step confirmation, marks cycle 'abandoned', redirects to /new-cycle
- **Stale check-in clearing**: useBootstrap clears `todayCheckIns` when date !== today on mount
- **Cross-device sync**: useBootstrap loads today's check-ins from Supabase for Brotherhood users
- **7-day history grid**: ProgressScreen now reads from `checkInHistory` for historical days
- **Onboarding celebrate step**: Added `celebrate` step to OnboardingFlow, fixes dual-render bug
- **XP net delta**: setDailyCheckIn now computes `xpForStatus(new) - xpForStatus(previous)` to prevent double-award
- **XP floor**: `Math.max(0, xp + xpDelta)` prevents negative XP locally and in Supabase sync
- **Squad member tiles**: HomeScreen shows anonymised member tiles (anchor initial + 4 domain dots)
- **SECURITY DEFINER RPC**: `get_squad_members_status()` in migration 005 — no UUID/name exposure
- **NewCycleScreen cycle number**: Queries actual count from Supabase instead of hardcoded `2`
- **Code splitting**: React.lazy + Suspense on 7 non-critical routes; vendor chunk separation
- **Bundle size**: Main bundle 490 kB → 66 kB (18.63 kB gzipped)
- **Public assets**: favicon.ico, logo192.png, logo512.png, robots.txt
- **Vercel config**: SPA rewrite + security headers + immutable asset cache
- **Plausible Analytics**: `data-domain="12k.app"` script in index.html
- **pb-safe CSS utility**: Added to index.css for iOS bottom-bar safe area inset
- **DetailScreen free tier**: Now shows 7-day local history instead of hard paywall
- **ProgressScreen streaks**: Added per-domain current/longest streak section

---

## Full Feature Inventory

### Pages (14)
SplashScreen, LoginPage, RegisterPage, OnboardingFlow (Day 0 win + celebrate step), HomeScreen, ProgressScreen, DetailScreen, ImproveScreen, YouScreen, SubscriptionScreen, AdminMetricsPage (/admin/metrics), NewCycleScreen (/new-cycle), PrivacyPolicyPage, TermsServicePage, HelpFAQPage

### Modals (4)
WeeklyVibeCheckModal, ProgressiveDomainSetupModal, Day84CompletionModal, AbandonCycleModal

### Edge Functions (7)
generate-kairos-nudge (Claude Haiku), match-to-squad, generate-squad-pulse (Claude Sonnet), stripe-webhook, save-push-subscription, compute-weekly-metrics, delete-account

### Supabase Migrations (5)
001 initial schema, 002 streak function, 003 push subscriptions, 004 cycle reflections, 005 squad_member_status SECURITY DEFINER RPC

### TanStack Query Hooks
useNudge, useUpdateNudgeStatus, useStreaks, useSquadPulse, useMatchToSquad, useSquadMembers, useDomainCheckIns

### Zustand Store (persisted)
onboardingComplete, todayCheckIns, checkInHistory (90-day rolling), streaks, profile, currentCycle, domainFocuses, lastVibeCheckDate

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
| PWA icons | /public/logo192.png + logo512.png (currently 1x1 placeholders) |
| Plausible domain | index.html data-domain="12k.app" must match registered domain |

---

## Deployment Steps (Once Credentials Available)

1. `cp .env.example .env` and fill in all values
2. `supabase db push` — runs all 5 migrations
3. `supabase secrets set ANTHROPIC_API_KEY=... STRIPE_WEBHOOK_SECRET=... VAPID_PRIVATE_KEY=...`
4. `supabase functions deploy --all`
5. `npm run build`
6. `vercel --prod`

---

## Test Status

52/52 unit tests passing (src/tests/kairos.test.ts + src/tests/gamification.test.ts).
TypeScript: no errors. Build: clean. Pre-commit hook: tsc + voice check + vitest.
25 local commits not yet pushed to origin/main.
