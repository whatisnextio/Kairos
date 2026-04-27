# HANDOFF.md

**Last updated:** 2026-04-27
**Branch:** main
**Last commit:** 1ae975a — Fix Stripe webhook race condition, SW open URL, and edge function formatting
**Next session priority:** Fill credentials in .env and Supabase Vault → deploy → soft launch

---

## State Right Now

App is feature-complete for soft launch. 66/66 unit tests passing, TypeScript clean, Biome clean, build clean. Pre-commit hook active (tsc + voice check + vitest). 15 migrations. 21 bugs fixed across three loop sessions.

---

## Loop Session 2026-04-27 (session 3) Shipped

- **Stripe webhook race condition**: checkout.session.completed now sets tier=brotherhood + status=active directly using client_reference_id=userId, eliminating the race where subscription.created fires before the customer ID is linked and silently no-ops
- **Stripe subscription.deleted cleanup**: now also resets cancel_at_period_end + current_period_end to false/null
- **Service worker openWindow**: notificationclick now opens /#/ instead of / to match HashRouter start_url
- **Edge function Biome formatting**: auto-fixed formatting across all 7 edge functions; fixed template literal lint in generate-kairos-nudge fallback

## Loop Session 2026-04-27 (session 2) Shipped

- **generate-kairos-nudge race**: Upsert with onConflict replaces insert for concurrent calls
- **Nudge XP stale closure**: useUpdateNudgeStatus onSuccess reads store at execution time
- **Dead code removal**: Orphaned SquadMember interface + unused 'reset' CycleStatus removed
- **NewCycleScreen route guard**: Redirects active-cycle users to '/' to prevent orphan rows
- **Stripe signature rotation**: verifyStripeSignature now accepts all v1= values from header
- **useMatchToSquad stale closure**: onSuccess reads store at execution time
- **Checkout verification flow**: localStorage flag + 3s polling spinner after Stripe redirect
- **cancel_at_period_end + current_period_end**: Webhook saves these; YouScreen shows "Cancels on X" or "Payment failed"
- **Migration 015**: cancel_at_period_end (bool) + current_period_end (timestamptz) on profiles
- **PWA manifest**: Split 'any maskable' icons, start_url '/#/', orientation portrait-primary
- **Button default type**: type="button" prevents accidental form submission
- **DEPLOY.md + HANDOFF.md**: Updated for 15 migrations and full credential list

## Loop Session 2026-04-26 Shipped

- AbandonCycleModal, stale check-in clearing, Brotherhood cross-device sync
- 7-day history grid, onboarding celebrate step, XP net delta + floor
- Squad member tiles, NewCycleScreen cycle count from Supabase
- Code splitting (66 kB main bundle), Vercel config, Plausible, pb-safe CSS
- DetailScreen free tier local history, ProgressScreen streak section
- Bootstrap ref guard, sign-out race fix, domain setup modal reappear
- ImproveScreen nudge states, Day84 modal fixes, send-daily-push auth guard
- Squad member count atomic RPC, stale check-in history reload, push UI sync

---

## Full Feature Inventory

### Pages (14)
SplashScreen, LoginPage, RegisterPage, OnboardingFlow, HomeScreen, ProgressScreen, DetailScreen, ImproveScreen, YouScreen, SubscriptionScreen, AdminMetricsPage, NewCycleScreen, PrivacyPolicyPage, TermsServicePage, HelpFAQPage

### Modals (4)
WeeklyVibeCheckModal, ProgressiveDomainSetupModal, Day84CompletionModal, AbandonCycleModal

### Edge Functions (8)
generate-kairos-nudge (Claude Haiku), match-to-squad, generate-squad-pulse (Claude Sonnet), stripe-webhook, save-push-subscription, send-daily-push, compute-weekly-metrics, delete-account

### Supabase Migrations (15)
001 initial schema, 002 streak function, 003 push subscriptions, 004 cycle reflections, 005 squad_member_status SECURITY DEFINER RPC, 006 streak trigger, 007 admin metrics RLS, 008 fix cycle reflection XP default (50 → 500), 009 squads member count constraint, 010 decrement squad member count, 011 fix streak missed same day, 012 fix squad anchor initial, 013 atomic XP increment, 014 increment squad member count, 015 subscription period

### Hooks
useBootstrap, useCheckIns, useStreaks, useNudge, useUpdateNudgeStatus, useSquadPulse, useSquadMembers, useMatchToSquad, useSubscriptionVerification

### Zustand Store (persisted)
onboardingComplete, todayCheckIns, checkInHistory (90-day rolling), streaks, profile, currentCycle, domainFocuses, lastVibeCheckDate

---

## Blocked On (Credentials Only)

| Item | Where |
|---|---|
| Supabase URL + anon key | .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Anthropic API key | Supabase Vault: ANTHROPIC_API_KEY |
| Stripe checkout URL | .env: VITE_STRIPE_CHECKOUT_URL |
| Stripe portal URL | .env: VITE_STRIPE_PORTAL_URL |
| Stripe webhook secret | Supabase Vault: STRIPE_WEBHOOK_SECRET |
| VAPID public key | .env: VITE_VAPID_PUBLIC_KEY |
| VAPID private key | Supabase Vault: VAPID_PRIVATE_KEY |
| PWA icons | /public/logo192.png + logo512.png exist (verify brand quality) |
| Plausible domain | data-domain="12k.app" in index.html — must match registered domain |

---

## Deployment Steps (Once Credentials Available)

See DEPLOY.md for full detail. In brief:

1. Fill `.env` (5 VITE_ vars)
2. `npx supabase link --project-ref YOUR_REF && npx supabase db push` (15 migrations)
3. Set Supabase Vault: ANTHROPIC_API_KEY, STRIPE_WEBHOOK_SECRET, VAPID_PRIVATE_KEY
4. `npx supabase functions deploy --all` (7 functions)
5. Configure Stripe webhook (4 events) + 4 Supabase cron jobs (nudge 06:00, push 07:00, squad 08:00 Sun, metrics 22:00 Sun)
6. `npm run build` → deploy dist/ to Vercel

---

## Test Status

66/66 unit tests passing (streak.test.ts × 14, gamification.test.ts × 20, kairos.test.ts × 32).
TypeScript: no errors. Build: clean. Biome: clean.
Pre-commit hook: tsc + voice check + vitest.
