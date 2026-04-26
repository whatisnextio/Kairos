# Phase 0 Decision Log

**Date:** 2026-04-26
**Status:** Locked. These decisions apply for v1. Revisit at Phase 7.

---

## D1: Pricing

**DECISION:** £7.99/month single tier (Brotherhood) for v1. No Lifechanger.
**RATIONALE:** Lifechanger differentiator is unclear. Three tiers split conversion attention. Current AI cost (£0.0078/user/month) and Stripe fees (~3%) leave healthy margin at £7.99. Market comp: Strava £8.99, Fitbod £9.99 — we sit below both, credibly.
**REVERSIBLE:** Yes. Lifechanger returns in v2 with a material differentiator (coach call / bloodwork / custom AI deep-dive). Not before.
**IMPLICATIONS:** Kill all Lifechanger CTAs in UI. Kill three-tier pricing page. Two states only: free and brotherhood.

---

## D2: AI layer — real, not mocked

**DECISION:** Claude Haiku 4.5 via Supabase Edge Function `generate-kairos-nudge`. No hardcoded mocks.
**RATIONALE:** The existing codebase has a hardcoded mock array covering KICKOFF and ANCHOR only. INCREASE, RHYTHM, OWN, SUSTAIN return nothing. This is the entire product differentiator and it does not exist. Real AI is the £7.99/month justification. Mocks are unshippable.
**REVERSIBLE:** No. Foundational architecture decision.
**COST:** ~£0.0003/nudge. £0.0078/user/month for Brotherhood (daily). Negligible at any meaningful user count.
**IMPLICATIONS:** Supabase Edge Function built before any ImproveScreen UI. Eval harness built and passing 80%+ before deploy. System prompt locked to brand voice (British English, no em dashes, no jargon, sharp coach).

---

## D3: Brotherhood squads — feature not just tier name

**DECISION:** Silent squads (4-8 people, same KAIROS phase, auto-matched) ship at v1.
**RATIONALE:** The brand promise is "Brotherhood." A tier name with zero community functionality is a broken promise. Silent accountability (check-in dots, no chat) is the differentiator — Strava kudos pattern, not Facebook feed pattern. Nobody builds silent accountability for men.
**REVERSIBLE:** No. Foundational to brand.
**IMPLICATIONS:** Supabase Edge Function `match-to-squad` built at Phase 3. No chat, no DMs, no leaderboards — ever. Anonymous tiles only (identity anchor + first letter). Weekly squad pulse via Claude Sonnet 4.6.

---

## D4: Onboarding — Day 0 win before Day 1 starts

**DECISION:** Restructure onboarding. Identity Anchor + first domain + micro-action + complete it now = Day 0 win. Remaining domains collected Days 1-3 via daily prompts. Cycle officially starts Day 1 morning.
**RATIONALE:** Current onboarding asks for an 84-day commitment before the user has felt a single win. Day 1 churn will be brutal. Day 0 win changes the psychology: user has already proven they can do it before the 12-week arc begins.
**REVERSIBLE:** Yes. Can A/B test against legacy flow once 50+ users.
**TARGET METRICS:** 90%+ complete Day 0 win. 75%+ return for Day 1. 60%+ have all 4 domains active by Day 4.

---

## D5: v1 kill list — locked

**DECISION:** The following features are cut from v1 entirely:
- Lifechanger tier (see D1)
- Badge wall
- Completed cycles history
- Full streak protection tokens
- Personal Objective (5th domain)
- All hardcoded AI mock arrays
- Advanced analytics beyond 6-metric dashboard
- Social sharing (badges, screenshots)
- In-app notifications centre
- Coach mode
- B2B dashboard

**RATIONALE:** Ship cleaner, faster. Validate the core loop (check-in, nudge, squad) before building ornamentation. Each of these features requires design, backend, and UX work that delays the core loop.
**REVERSIBLE:** Yes. Every item on this list returns in v2 only with a data-backed reason.

---

## D6: Stack — locked at H+24

**DECISION:** No further stack debate after this point.

Frontend: Vite 5 + React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui + Zustand + TanStack Query v5 + React Router 6 (HashRouter) + Lucide React + date-fns

Backend: Supabase (Auth, Postgres, Edge Functions, Realtime, Vault) + Stripe Checkout + Customer Portal + Stripe Webhooks via Edge Function

AI: Claude Haiku 4.5 (nudges) + Claude Sonnet 4.6 (squad pulse, Day 84 reflection)

Infra: Vercel (frontend) + Supabase Cloud EU + Plausible Analytics + Sentry + Resend + Workbox + vite-plugin-pwa

**RATIONALE:** This is the right stack. No new library additions without a documented reason. No swapping providers mid-build.

---

## D7: Source of truth — build clean, keep reference

**DECISION:** The `12k_transform_populated/` directory is kept as read-only reference. All new code is built in the repo root. `12k_transform_populated/` is gitignored from future CI.
**RATIONALE:** Audit confirmed 0 of 34 files are compilable. The directory was produced by a broken export pipeline. The naming/structure is useful reference. The content is not.

---

## Open questions (not yet decided)

| Question | Owner | Deadline |
|---|---|---|
| Supabase project already provisioned? Check for existing credentials. | Liam | H+24 |
| PostHog for funnel analysis alongside Plausible? | Liam | H+72 |
| XP constants (XP_PER_CHECK_IN_DONE, XP_PER_CHECK_IN_PARTIAL)? | Design | H+24 |
| Exact accent green hex from brand doc? | Liam | H+24 |
| Annual plan price at launch (£79 proposed)? | Liam | H+336 (soft launch) |
