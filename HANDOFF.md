# HANDOFF — Kairos / 12K

**Last updated:** 2026-04-26
**Hours since launch:** H+0 (session 2)
**Next session priority:** Phase 3 — TanStack Query hooks, ImproveScreen nudge fetch, Stripe webhook Edge Function

---

## State right now

- **Phase 0:** Complete. Audit done, decisions logged, repo skeleton built.
- **Phase 1:** Complete. Full React + TS + Tailwind + Zustand scaffold, 0 TS errors.
- **Phase 2:** Complete. Supabase schema + Edge Functions + Vitest unit tests + WeeklyVibeCheckModal.
- **Phase 3:** Not started. Requires Supabase credentials.
- **Stripe:** Not wired. Requires credentials.

---

## What was shipped this session

### Supabase Edge Functions
1. `supabase/functions/generate-kairos-nudge/index.ts` — Daily AI nudge via Claude Haiku 4.5. JWT auth, free/brotherhood tier gate, date-based cache, full user state (cycle, focuses, streaks, vibe check), stores to ai_nudges with cost_pence tracking.
2. `supabase/functions/match-to-squad/index.ts` — Silent squad matching. Same KAIROS phase + cycle start within 7 days, fills existing squads to 8 before creating new ones. Brotherhood only.
3. `supabase/functions/generate-squad-pulse/index.ts` — Sunday squad pulse via Claude Sonnet 4.6. Processes all eligible squads (4+ members), collects anonymised stats (avg streak, avg completion rate), upserts to squad_pulses by week number.

### Testing
4. `src/tests/kairos.test.ts` — 32 tests for all KAIROS utility functions. 52/52 passing total.
5. `src/tests/gamification.test.ts` — 20 tests for XP level system, boundary transitions.

### UI
6. `src/components/modals/WeeklyVibeCheckModal.tsx` — 5-option vibe check (1=Rough to 5=Elite), bottom-sheet modal, syncs to Supabase for Brotherhood users.
7. `src/store/useAppStore.ts` — Added `submitVibeCheck` action, `lastVibeCheckDate` state (persisted).
8. `src/pages/HomeScreen.tsx` — WeeklyVibeCheckModal wired: shows on Sundays when 7+ days since last check.

---

## Blocked on (requires Liam input)

1. **Supabase credentials** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
2. **Stripe credentials** — `VITE_STRIPE_CHECKOUT_URL` (Brotherhood £7.99/month).
3. **Anthropic API key** — Supabase Vault secret for Edge Functions.
4. **Accent green hex** — Currently `#22C55E`. Confirm or override.

---

## Next 3 tasks (in order)

1. **TanStack Query hooks** — `useNudge`, `useStreaks`, `useSquad` hooks fetching from Supabase + Edge Functions.
2. **ImproveScreen nudge fetch** — Wire `useNudge` into ImproveScreen, call generate-kairos-nudge Edge Function.
3. **Stripe webhook Edge Function** — `supabase/functions/stripe-webhook/index.ts` — syncs profiles.tier on subscription events.

---

## Key file index

| File | Purpose |
|---|---|
| `ROADMAP.md` | Master plan, all phases and specs |
| `audit/decisions.md` | Locked decisions D1-D7 |
| `src/types/index.ts` | All TypeScript types |
| `src/utils/kairos.ts` | KAIROS phase logic |
| `src/utils/gamification.ts` | XP level system |
| `src/store/useAppStore.ts` | Zustand store, all actions including submitVibeCheck |
| `src/pages/HomeScreen.tsx` | Daily check-in + WeeklyVibeCheckModal trigger |
| `src/pages/ImproveScreen.tsx` | AI nudge tab (needs TanStack Query hook) |
| `supabase/migrations/001_initial_schema.sql` | All 12 tables + RLS + triggers |
| `supabase/migrations/002_streak_update_function.sql` | update_streak() PL/pgSQL |
| `supabase/functions/generate-kairos-nudge/index.ts` | Daily nudge Edge Function |
| `supabase/functions/match-to-squad/index.ts` | Squad matching Edge Function |
| `supabase/functions/generate-squad-pulse/index.ts` | Squad pulse Edge Function |
| `src/tests/kairos.test.ts` | 32 Vitest tests for KAIROS utils |
| `src/tests/gamification.test.ts` | 20 Vitest tests for XP system |
| `src/components/modals/WeeklyVibeCheckModal.tsx` | Weekly vibe check modal |

---

## Test status

- TypeScript: 0 errors
- Unit tests: 52/52 passing (Vitest)
- E2E: not yet written (Playwright configured)

## Voice check status

- British English: enforced
- No em dashes: confirmed
- No wellness jargon: confirmed
