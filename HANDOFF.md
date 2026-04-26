# HANDOFF — Kairos / 12K

**Last updated:** 2026-04-26
**Hours since launch:** H+0 (session 1)
**Next session priority:** Supabase project setup + schema migrations

---

## State right now

- **Phase 0:** Complete. Audit done, decisions logged, repo skeleton built.
- **Phase 1 foundation:** Complete. Vite + React + TS + Tailwind wired, all screens scaffolded, types, store, router, auth, onboarding all real code. TypeScript clean (0 errors).
- **Phase 2:** Not started. Requires Supabase credentials.
- **AI nudge:** Not built. Edge Function spec is in ROADMAP.md Section 18.
- **Squads:** Not built.
- **Stripe:** Not wired.

---

## What was shipped this session

1. `ROADMAP.md` — full master plan saved at repo root
2. `audit/file-inventory.md` — 34 files audited, 0 real
3. `audit/salvage-list.md` — what to copy from legacy dir
4. `audit/decisions.md` — D1-D7 locked
5. Clean repo scaffold at `C:\Users\ldgmc\Documents\Kairos\`:
   - `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `biome.json`
   - `index.html` — dark, Oswald + Inter, correct meta tags
   - `src/vite-env.d.ts` — ImportMeta env types
   - `src/types/index.ts` — all types: phases, domains, profile, cycle, check-in, nudge, squad, XP
   - `src/utils/kairos.ts` — KAIROS phase logic, day-to-phase, progress percentages
   - `src/utils/gamification.ts` — XP levels 1-10 (Starter to Kairos)
   - `src/services/supabaseClient.ts` — createClient wired to env vars
   - `src/store/useAppStore.ts` — Zustand store: auth, cycle, check-in (optimistic + Supabase sync), nudge, squad, onboarding
   - `src/index.css` — Tailwind layers, all component classes (.btn, .card, .input-field, .tab-item)
   - `src/main.tsx` — React root + TanStack Query provider
   - `src/App.tsx` — auth router, onboarding gate, full app routes
   - `src/components/layout/AppShell.tsx` + `BottomTabBar.tsx`
   - `src/components/common/Button.tsx`, `Card.tsx`, `Input.tsx`
   - All pages: SplashScreen, LoginPage, RegisterPage, OnboardingFlow, HomeScreen, ProgressScreen, DetailScreen, ImproveScreen, YouScreen, SubscriptionScreen, PrivacyPolicyPage, TermsServicePage, HelpFAQPage

---

## What was learned this session

- Legacy `12k_transform_populated/` is 100% broken — a failed export pipeline put wrong content in every file. 0 of 34 files are real code. Kept for reference, not reuse.
- KAIROS phase logic was entirely absent from the legacy codebase. Built from scratch.
- Stack is correct. Vite + React 18 + TS 5 + Tailwind 3 + Zustand + TanStack Query + Supabase = right choices.
- TypeScript strict mode passes clean on the full scaffold.

---

## Blocked on (requires Liam input)

1. **Supabase credentials** — need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Is a Supabase project already provisioned?
2. **Stripe credentials** — need `VITE_STRIPE_CHECKOUT_URL` (Brotherhood £7.99/month checkout link). Is Stripe set up?
3. **Accent green hex** — brand doc references green but exact hex not confirmed. Currently `#22C55E` (Tailwind green-500). Confirm or override.
4. **XP constants** — `XP_PER_CHECK_IN_DONE = 10`, `XP_PER_CHECK_IN_PARTIAL = 5`. Reasonable? Lock or adjust?
5. **Anthropic API key** — needed for Edge Function. Goes in Supabase Vault, not `.env`.

---

## Next 3 tasks (in order)

1. **Set up Supabase project** (if not done): create project in EU region, copy URL and anon key to `.env`
2. **Run database migrations**: schema from ROADMAP.md Section 17, RLS policies for each table
3. **Build `generate-kairos-nudge` Edge Function**: spec in ROADMAP.md Section 18, deploy via Supabase CLI

---

## Key file index

| File | Purpose |
|---|---|
| `ROADMAP.md` | Master plan, all phases and specs |
| `audit/decisions.md` | Locked decisions D1-D7 |
| `src/types/index.ts` | All TypeScript types, phase/domain/anchor constants |
| `src/utils/kairos.ts` | KAIROS phase logic |
| `src/store/useAppStore.ts` | Zustand store, all actions |
| `src/pages/onboarding/OnboardingFlow.tsx` | Day 0 win onboarding |
| `src/pages/HomeScreen.tsx` | Daily check-in dashboard |
| `src/pages/ImproveScreen.tsx` | AI nudge tab |

---

## Voice check status

- British English: enforced in all UI copy
- No em dashes: confirmed
- No wellness jargon: confirmed
- Brand voice (sharp, direct, action-oriented): applied

## Test status

- TypeScript: 0 errors
- Unit tests: not yet written (Vitest configured in package.json, no test files yet)
- E2E: not yet written (Playwright configured)
- Lighthouse: not yet run (dev server not started this session)
