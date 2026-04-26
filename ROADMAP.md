# KAIROS / 12K MASTER ROADMAP
## Claude Code Operational Plan

**Version:** 1.0
**Date issued:** 2026-04-26
**Owner:** Liam McDowell
**Operating mode:** Hours, not days. Ship in 14, monetise in 30.
**Goal:** Public soft launch of 12K PWA at H+336, paid subscriptions live at H+504, first 100 paying users by H+1,440.

---

## TABLE OF CONTENTS

1. [Mission and thesis](#1-mission-and-thesis)
2. [The honest assessment](#2-the-honest-assessment)
3. [Strategic shifts](#3-strategic-shifts)
4. [Success definition](#4-success-definition)
5. [Non-negotiables](#5-non-negotiables)
6. [Substrate stack](#6-substrate-stack)
7. [Build vs wrap vs buy](#7-build-vs-wrap-vs-buy)
8. [Phase 0 - Triage and analysis (H0-H24)](#8-phase-0--triage-and-analysis-h0-h24)
9. [Phase 1 - Repo restructure (H24-H72)](#9-phase-1--repo-restructure-h24-h72)
10. [Phase 2 - Real AI layer (H72-H120)](#10-phase-2--real-ai-layer-h72-h120)
11. [Phase 3 - Brotherhood squads (H120-H168)](#11-phase-3--brotherhood-squads-h120-h168)
12. [Phase 4 - Onboarding fix (H168-H216)](#12-phase-4--onboarding-fix-h168-h216)
13. [Phase 5 - Soft launch (H216-H336)](#13-phase-5--soft-launch-h216-h336)
14. [Phase 6 - Public launch (H336-H504)](#14-phase-6--public-launch-h336-h504)
15. [Phase 7 - Growth and SHOT PERFORM tie-in (H504+)](#15-phase-7--growth-and-shot-perform-tie-in-h504)
16. [The product spec](#16-the-product-spec)
17. [Database schema](#17-database-schema)
18. [The AI nudge engine](#18-the-ai-nudge-engine)
19. [The Brotherhood squad system](#19-the-brotherhood-squad-system)
20. [Pricing and monetisation](#20-pricing-and-monetisation)
21. [Outcome and metrics tracking](#21-outcome-and-metrics-tracking)
22. [Self-improvement loops](#22-self-improvement-loops)
23. [Security, privacy, safeguarding](#23-security-privacy-safeguarding)
24. [Cost economics](#24-cost-economics)
25. [Multi-agent build plan with Claude Code](#25-multi-agent-build-plan-with-claude-code)
26. [Handoff system](#26-handoff-system)
27. [Loops and automations](#27-loops-and-automations)
28. [Kill list](#28-kill-list)
29. [Session continuity pack](#29-session-continuity-pack)
30. [The commander's intent](#30-the-commanders-intent)

---

## 1. MISSION AND THESIS

We are not building a wellness app. We are not building a habit tracker. We are building a 12-week behavioural transformation system delivered through a stark, brutalist PWA that respects men's intelligence and doesn't sugar-coat the work.

12K is the consumer surface. KAIROS is the underlying framework. Six 14-day phases (KICKOFF, ANCHOR, INCREASE, RHYTHM, OWN, SUSTAIN) across an 84-day arc, anchored to a chosen identity, tracked across four core life domains (BODY, LOVE, MISSION, SPIRIT) plus an optional fifth.

The promise is simple: 84 days of structured action, daily one-tap check-ins, AI nudges that get personal not generic, a silent squad that holds you accountable without performative bullshit. Pay £7.99/month. Show up. Transform.

When the user wakes on Day 84, they're not the same person who started. That's not marketing. That's the system working.

Other habit apps are open-ended grinds. KAIROS has structure, narrative, and a finish line. Nobody owns the structured arc lane. We do.

If we ship right, 12K becomes a £15-£40k MRR side venture in Year 1, then a £200k+ MRR brand by Year 3, and the KAIROS framework licenses into SHOT PERFORM as the curriculum scaffold for athletes. That's the bigger play.

---

## 2. THE HONEST ASSESSMENT

The design doc is competent. The execution is blocked. Here's the brutal read on what's in front of us right now.

### What's actually shipped

A 12,000-line concatenated file dump masquerading as a codebase. The Vite + React + TypeScript + Supabase + Stripe stack is correct. The KAIROS phase logic is real. The design tokens are sharp. The brand voice is right.

### What's broken

1. **The repo isn't a repo.** Multiple component files contain placeholder text instead of real code. Six critical store functions are stubbed with `/* ... as before ... */`. Multiple files return `// No content found for this file`. Cursor and Claude Code cannot build this.

2. **The AI layer is vapour.** The "AI Tactical Edge" is a hardcoded mock array of 3-4 suggestions tied to KICKOFF and ANCHOR phases only. INCREASE, RHYTHM, OWN, SUSTAIN return nothing. Lifechanger tier gets exactly one extra hardcoded card. This is the entire differentiator between Free and Paid, and it doesn't exist.

3. **Pricing is upside-down.** £5 Brotherhood undersells the system. Compare market: Whoop £27, Strava £8.99, Fitbod £9.99, Calm £39.99/year. We're selling transformation at vitamins-aisle prices.

4. **Brotherhood is a name with no feature behind it.** The brand promises a Brotherhood. The product has zero community functionality.

5. **The 84-day commitment is asked too early.** Onboarding is Anchor → Focus Setup → Cycle Start. The user has felt zero wins before the 12-week mental commitment.

6. **No Day 84 plan.** The cycle ends. Then what? Codebase has no answer.

### What's right

- KAIROS framework as a structured arc product is differentiated.
- Identity Anchor onboarding is sharp.
- The four-corners-plus-one domain model is balanced.
- Tech stack is right. Vite + React + Supabase + Stripe.
- Brand spine is right. Black background, Oswald + Inter, Core Base Black #0B0B0B with green accent.

### The single biggest unlock

Build the AI nudge engine for real. One Supabase Edge Function calling Claude Haiku, personalised by identity anchor + phase + last 7 days of check-ins + streaks + vibe check. Daily personal nudge at £0.001 per user per day. That's the moat. That's the £7.99/month justification.

---

## 3. STRATEGIC SHIFTS

### Shift 1: Two tiers, not three

Cut Lifechanger from v1. £7.99/month single Brotherhood tier. Lifechanger comes back at v2 once we have data.

### Shift 2: The AI layer is the product

Real AI nudges via Claude Haiku Edge Function. Not hardcoded mocks. Personalised every day. Free users get one nudge per week. Paid users get one per day plus a weekly challenge.

### Shift 3: Brotherhood as a real feature

Silent squads. 4-8 people, same phase, auto-matched. See each other's daily check-in dots. No chat, no DMs, no leaderboards.

### Shift 4: Day 0 win before Day 1 starts

Restructure onboarding. Welcome → Identity Anchor → Pick first domain (just one) → Set today's 5-min micro-action → Complete it now → First win. Other three domains collected across Days 1-3.

### Shift 5: Cut everything that isn't earning its place at launch

Cut from v1: Lifechanger tier, badge wall, completed cycles history, full streak protection, Personal Objective 5th domain, all hardcoded AI mocks, advanced analytics.

### Shift 6: 12K as SHOT secondary brand

KAIROS framework licensed into SHOT PERFORM. SHOT athletes get free Brotherhood-tier access bundled. Phase 7 work, not launch work.

---

## 4. SUCCESS DEFINITION

| Metric | H+336 (soft launch) | H+1,440 (60 days) | H+2,880 (4 months) | H+8,760 (1 year) |
|---|---|---|---|---|
| Total users | 50 | 1,500 | 5,000 | 15,000 |
| Paid users | 0 | 100 | 400 | 1,500 |
| Free-to-paid conversion | n/a | 7% | 8% | 10% |
| Day 7 retention | 60% | 65% | 70% | 75% |
| Day 84 cycle completion | n/a | 25% | 35% | 50% |
| MRR | £0 | £800 | £3,200 | £12,000 |

Miss any target by more than 25% for 14 days: kill the underperforming feature, not the metric.

---

## 5. NON-NEGOTIABLES

1. **Honest pricing.** £7.99/month single tier at launch.
2. **The AI layer must be real.** Claude Haiku Edge Function, personalised, daily.
3. **Brotherhood as a feature, not just a tier name.** Silent squads functional at launch.
4. **British English throughout. No em dashes. No corporate language. No wellness jargon.**
5. **The onboarding flow earns a Day 0 win before Day 1 starts.**
6. **Stripe live before public launch, not after.**
7. **PWA installability and offline-first for free-tier core flows.**
8. **Lighthouse PWA score 95+ at launch.**
9. **No data sharing with third parties. Plausible only.**
10. **Hard 18+ age gate at signup.**

---

## 6. SUBSTRATE STACK

### Frontend
- Vite 5+ with React 18+ + TypeScript 5+
- Tailwind CSS 3+ with custom design tokens
- shadcn/ui for component primitives (dark theme only)
- Zustand for client state with persistence
- TanStack Query v5 for server state
- React Router 6 with HashRouter
- Lucide React for icons
- date-fns for date handling (UTC-safe)

### Backend
- Supabase for auth, Postgres, Realtime, Storage, Edge Functions, Vault
- Supabase Auth with email magic link primary
- Postgres with Row-Level Security on everything
- Supabase Edge Functions (Deno) for AI nudge, Stripe webhooks, squad matching

### AI Layer
- Claude Haiku 4.5 for daily nudges
- Claude Sonnet 4.6 for weekly squad pulse and Day 84 reflections
- Cached generation (one nudge per user per day)

### Payments
- Stripe Checkout for subscription onboarding
- Stripe Customer Portal for subscription management
- Stripe Webhooks via Supabase Edge Function

### Notifications
- Web Push (VAPID) for daily reminders
- Resend for transactional email

### PWA
- Workbox 7+ for service worker
- vite-plugin-pwa for build-time wiring

### Hosting
- Vercel for frontend
- Supabase Cloud EU region

### Observability
- Plausible Analytics
- Sentry for error tracking

### Development
- Claude Code as primary agent
- GitHub, GitHub Actions for CI
- pnpm for package management
- Biome for code quality
- Vitest for unit tests
- Playwright for E2E (critical paths only)

---

## 7. BUILD VS WRAP VS BUY

### Build (the moat)
- KAIROS phase logic
- AI nudge engine
- Squad matching algorithm
- Identity Anchor onboarding
- Vibe Check + Outcome loop
- Day 84 reflection generator

### Wrap (substrate)
- Supabase Auth, Postgres, Edge Functions, Realtime
- Stripe Checkout + Customer Portal
- Web Push API + VAPID
- Resend, Workbox, vite-plugin-pwa, Plausible, Sentry

### Buy
- Anthropic API (Claude Haiku/Sonnet)
- Resend, Plausible, Sentry, Vercel Pro, Supabase Pro

Monthly substrate cost at launch: ~£71 fixed + ~£0.001/user/day AI compute.

---

## 8. PHASE 0 - TRIAGE AND ANALYSIS (H0-H24)

No new code in the first 24 hours. Understand what's there, decide what to keep.

### H0-H4: File audit
Claude Code reads every file. Output: `audit/file-inventory.md`

| File path | Status | Lines | Real or placeholder | Keep / rebuild / delete | Notes |

Status buckets: REAL, STUB, EMPTY, DUPLICATE, DESIGN-DOC

### H4-H8: Architecture extraction
Extract salvageable parts: type definitions, KAIROS phase helpers, design tokens, routing structure, store schema.
Output: `audit/salvage-list.md`

### H8-H16: Decision log
Output: `audit/decisions.md` with D1-D5 decisions (pricing, AI, squads, onboarding, cuts).

### H16-H24: Repo skeleton
Create new repo structure per Appendix B. No business logic yet.
Commit: `chore: initial scaffolding for KAIROS v1 rebuild`

---

## 9. PHASE 1 - REPO RESTRUCTURE (H24-H72)

### H24-H40: Foundation
- Vite + React + TS + Tailwind initialised
- shadcn/ui installed, design tokens applied
- Supabase client wired
- Zustand store skeleton with typed slices
- TanStack Query provider
- Router with HashRouter
- Service worker via vite-plugin-pwa
- Web App Manifest with proper icons

### H40-H56: Auth and onboarding shells
- Login (magic link primary, password optional)
- Register with hard 18+ age gate
- Password reset
- Onboarding steps 1-4 (Welcome, Identity Anchor, First domain + micro-action, Day 0 win)

### H56-H72: Core screens scaffolded
- Home, Progress, Detail, Improve, You tabs
- Bottom tab bar
- All screens rendering with mock data

**Phase 1 target:** PWA installable, auth working, onboarding end-to-end, all 5 tabs render. Lighthouse 90+.

---

## 10. PHASE 2 - REAL AI LAYER (H72-H120)

### H72-H88: Nudge engine - backend
Supabase Edge Function `generate-kairos-nudge`:
- Calls Claude Haiku 4.5
- Input: identity_anchor, phase, day_in_cycle, domain_focuses, recent_checkins, streaks, vibe_check, tier
- Output: title (<60 chars), body (<200 chars), type, domain, xp_reward, cta
- Cached by user_id + date in ai_nudges table
- Free: weekly (Sunday). Brotherhood: daily 06:00 user-local.

### H88-H104: Nudge engine - frontend
- Improve tab fetches ai_nudges table
- Accept / Dismiss / Mark Complete actions
- Free tier: blurred previews with upgrade CTA on non-Sunday days
- Refresh (rate-limited: 3/day)

### H104-H120: Quality harness
- Eval dataset: 50 sample states (5 phases x 4 domains x variation)
- LLM-as-judge (Claude Sonnet 4.6) grades voice, personalisation, actionability, brevity
- Pass threshold: 80%+. Block deploys that drop below.

**Phase 2 target:** Real AI nudges daily for paid, weekly for free. £0.001/user/day cost.

---

## 11. PHASE 3 - BROTHERHOOD SQUADS (H120-H168)

### H120-H136: Squad matching
Edge Function `match-to-squad`:
- Same KAIROS phase + cycle start within 7 days
- Target 6 members, range 4-8
- No real names, no contact details
- Rematch when squad < 4 active

### H136-H152: Squad surface
- Home screen card: anonymous member tiles, check-in dots, squad streak
- No chat, no DMs, no leaderboards
- Members see check-in status only

### H152-H168: Weekly squad pulse
- Edge Function `generate-squad-pulse` every Sunday 18:00
- Claude Sonnet 4.6 generates one message from squad's week
- Push notification to all squad members

**Phase 3 target:** Squads working. +10% Day 7 retention vs. unmatched users.

---

## 12. PHASE 4 - ONBOARDING FIX (H168-H216)

Day 0 win flow (under 3 minutes):
1. Welcome (15s)
2. Identity Anchor (45s)
3. Pick first domain (30s)
4. Today's micro-action (60s)
5. Complete now (variable)
6. First win celebration (15s)

Days 1-3 progressive setup: remaining domains collected via daily prompts.

**Target:** 90%+ complete Day 0 win. 75%+ return for Day 1. 60%+ have all 4 domains active by Day 4.

---

## 13. PHASE 5 - SOFT LAUNCH (H216-H336)

- PWA on staging URL
- 50 testers from Liam's network
- Daily bug triage, fixes within 4 hours
- AI nudge quality monitored daily
- Final Lighthouse pass, accessibility pass
- Stripe test mode validated
- Privacy policy and ToS finalised

**Target:** 50 testers daily, Day 7 retention 60%+, nudge quality 80%+.

---

## 14. PHASE 6 - PUBLIC LAUNCH (H336-H504)

- Stripe live mode, £7.99/month Brotherhood live
- Founder content series @liammcdx (7-day arc)
- Founding member offer: first 100 annual at £79
- ProductHunt, IndieHackers, affiliate programme

**Target:** 100 paying users, £800 MRR, churn <5%/week, NPS 40+.

---

## 15. PHASE 7 - GROWTH AND SHOT PERFORM TIE-IN (H504+)

- Day 84 reflection generator
- Cycle 2 re-enrollment flow
- KAIROS framework licensed to SHOT PERFORM
- SHOT athletes get Brotherhood free, bundled
- Lifechanger v2 with material differentiator
- B2B offering

**Target:** 1,500 paying users, £12k MRR, KAIROS in SHOT PERFORM live.

---

## 16. THE PRODUCT SPEC

### Five tabs

**Home:** Progress rings (inner = phase, outer = cycle), phase banner, today's nudge, domain tiles, squad pulse mini-card.

**Progress:** XP graph, streak history, phase progression, cycle completion %, re-enrollment CTA.

**Detail:** Per-domain calendar, self-logged notes, trend lines (paid).

**Improve:** Today's nudge, active challenges, recently completed, refresh button.

**You:** Identity anchor, phase + cycle progress, subscription tier, settings, privacy/ToS/help.

### Cross-cutting
- Daily check-in: one-tap per domain (Green / Amber / Red)
- Weekly Vibe Check: Sunday or Monday, 1-5 scale
- Squad surface: Home card, paid only
- Day 84 reflection: AI-generated, all users

---

## 17. DATABASE SCHEMA

```sql
-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  identity_anchor_id text not null,
  tier text not null default 'free' check (tier in ('free', 'brotherhood')),
  xp integer not null default 0,
  current_kairos_cycle_id uuid references kairos_cycles(id),
  date_of_birth date not null,
  squad_id uuid references squads(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table identity_anchors (
  id text primary key,
  name text not null,
  description text not null,
  icon text
);

create table kairos_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'reset', 'abandoned')),
  total_xp_earned integer default 0,
  completion_percentage numeric(5,2),
  created_at timestamptz default now()
);

create table user_domain_focuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cycle_id uuid not null references kairos_cycles(id) on delete cascade,
  domain_type text not null check (domain_type in ('BODY', 'LOVE', 'MISSION', 'SPIRIT', 'PERSONAL_OBJECTIVE')),
  focus_description text not null,
  personal_objective_name text,
  set_at timestamptz default now(),
  unique (user_id, cycle_id, domain_type)
);

create table daily_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cycle_id uuid not null references kairos_cycles(id) on delete cascade,
  date date not null,
  domain_type text not null,
  status text not null check (status in ('Done', 'Partial', 'Missed', 'Pending', 'Protected')),
  notes text,
  xp_awarded integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, cycle_id, date, domain_type)
);

create table user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  domain_type text not null,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_check_in_date date,
  unique (user_id, domain_type)
);

create table vibe_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cycle_id uuid not null references kairos_cycles(id) on delete cascade,
  date date not null,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz default now()
);

create table ai_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  type text not null check (type in ('daily_nudge', 'weekly_challenge', 'squad_pulse', 'cycle_reflection')),
  title text not null,
  body text not null,
  domain_type text,
  kairos_phase text,
  xp_reward integer,
  status text default 'new' check (status in ('new', 'accepted', 'completed', 'dismissed')),
  generated_at timestamptz default now(),
  cost_pence integer,
  unique (user_id, date, type)
);

create table squads (
  id uuid primary key default gen_random_uuid(),
  kairos_phase text not null,
  cycle_start_window date not null,
  member_count integer default 0,
  created_at timestamptz default now()
);

create table squad_pulses (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  week_number integer not null,
  message text not null,
  generated_at timestamptz default now(),
  unique (squad_id, week_number)
);

create table outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cycle_id uuid references kairos_cycles(id),
  metric_type text not null,
  metric_value numeric,
  recorded_at timestamptz default now()
);
```

RLS enforced on every table. Users read/write own data only. Squad pulses visible to squad members. Squads read-only for members.

---

## 18. THE AI NUDGE ENGINE

### System prompt (Claude Haiku)

```
You are the KAIROS nudge engine. You write short, sharp, personal daily messages to men in a 12-week behavioural transformation programme.

Voice rules:
- South UK British English. No em dashes, use commas or full stops.
- No corporate language. No wellness jargon. No "embrace your authentic journey."
- No emojis unless the user has asked for them.
- Direct, respectful, action-oriented.
- Sound like a sharp coach, not a chatbot.

Length:
- Title: under 60 characters.
- Body: under 200 characters.

Personalisation:
Reference at least one of: identity anchor, current KAIROS phase, recent check-ins, streaks, last vibe check.

KAIROS phase contexts:
- KICKOFF (Days 1-14): Build the base. Consistency over perfection.
- ANCHOR (Days 15-28): Lock in habits. Streak matters now.
- INCREASE (Days 29-42): Step up intensity. 10-15% more.
- RHYTHM (Days 43-56): Find natural flow. Variability welcome.
- OWN (Days 57-70): Identity crystallisation. You are this now.
- SUSTAIN (Days 71-84): Plan the long game. Beyond the cycle.

Output format: JSON only, no markdown.
{
  "title": "string",
  "body": "string",
  "type": "daily_nudge" | "weekly_challenge",
  "domain": "BODY" | "LOVE" | "MISSION" | "SPIRIT" | null,
  "xp_reward": number | null,
  "cta": "check_in_now" | "reflect" | "plan_tomorrow" | null
}
```

### Cost economics

- Cost per nudge: ~£0.0003 (500 input + 100 output tokens, Haiku rates)
- Free tier (1/week): £0.0012/user/month
- Brotherhood (1/day): £0.0078/user/month
- At 1,000 paying users: £7.80/month AI cost
- Negligible against £8k+ MRR

---

## 19. THE BROTHERHOOD SQUAD SYSTEM

### Matching
- Same KAIROS phase + cycle start within 7 days
- Target 6, range 4-8
- Rematch when squad < 4 active
- No real names or contact details shared

### Squad surface
- Anonymous tiles: identity anchor + first letter only
- Today's check-in dots (4 per member, one per domain)
- Squad collective streak
- Sunday pulse message
- No chat, no DMs, no leaderboards

### Weekly pulse
- Sunday 18:00 user-local
- Claude Sonnet 4.6 generates one message from squad's week data
- Push notification to all members

### Retention targets
- +10% Day 7 retention for squad-matched vs. unmatched
- +20% Day 84 completion for squad-matched

---

## 20. PRICING AND MONETISATION

- **Free:** Track 4 domains, basic rings, weekly Vibe Check, weekly AI nudge (Sunday), local-first.
- **Brotherhood:** £7.99/month or £79/year. Daily nudges, squads, full XP/streaks, cloud sync, push, Day 84 reflection.

Founding member offer: first 100 annual at £79 (vs £95.88 monthly equivalent).

Refund: 7-day no-questions. Cancel anytime.

---

## 21. OUTCOME AND METRICS TRACKING

| Metric | How measured |
|---|---|
| Total users | profiles count |
| Paid users | tier = brotherhood AND subscription_status = active |
| Conversion rate | paid / total, rolling 30 days |
| Day 7 retention | % checking in at least once between Days 5-7 |
| Day 84 completion | % reaching Day 84 in active state |
| MRR | Stripe MRR via API |

Weekly Edge Function `compute-weekly-metrics` aggregates to `metrics_snapshots`.
Admin route `/admin/metrics` for Liam.

---

## 22. SELF-IMPROVEMENT LOOPS

### Daily
Every nudge logs user state + output + user action + subsequent check-in. Weekly job finds correlations.

### Weekly
Nudge eval harness runs every Sunday. Alert if quality < 80%.

### Monthly
Cohort retention review: signups, churn timing, high-engagement patterns, silent users.

### Quarterly
Pricing and feature review based on real data.

---

## 23. SECURITY, PRIVACY, SAFEGUARDING

- Magic link primary auth, password fallback
- Email verification required
- Session 30 days rolling
- All data EU region (Supabase EU)
- TLS 1.3+, HSTS preloaded
- RLS on every table
- GDPR: data export and account deletion self-service
- No third-party trackers (Plausible only)
- Hard 18+ gate (DOB required and validated)
- No real names in squad surface
- Stripe handles all PCI compliance

---

## 24. COST ECONOMICS

### Monthly fixed
- Vercel Pro: £20
- Supabase Pro: £25
- Plausible: £9
- Resend: £15
- Sentry: £0
- Domain + DNS: £2
- **Total: £71/month**

### At 1,000 paying users
- AI compute: £10
- Stripe fees (~3%): £240
- Bandwidth: £5
- **Net at £8k MRR: ~£7,644/month**

### Revenue milestones

| Paid users | MRR | Net |
|---|---|---|
| 100 | £799 | £699 |
| 500 | £3,995 | £3,795 |
| 1,000 | £7,990 | £7,644 |
| 5,000 | £39,950 | £38,450 |

---

## 25. MULTI-AGENT BUILD PLAN

| Agent | Role |
|---|---|
| Architect | Reads codebase, plans, writes specs |
| Builder | Ships features end-to-end |
| Tester | Writes and runs Vitest + Playwright |
| Reviewer | Voice/brand drift checks |
| Migrator | DB schema, RLS policies |
| Eval-runner | Nudge eval harness |

### Pre-commit hook
- Type check + lint
- Tests (changed files, fast)
- Voice check (grep for em dashes, "embrace", "journey", "authentic" -- refuse on hit)

### Pre-deploy gate
- Lighthouse CI 95+
- All tests pass
- Nudge eval 80%+ if changed
- Manual approval (Liam) for production

---

## 26. HANDOFF SYSTEM

### Files at repo root

**ROADMAP.md** -- this file. Updated when phases ship or pivots happen.

**HANDOFF.md** -- session continuity log.

```markdown
**Last session ended:** [timestamp]
**Hours since launch:** H+[n]
**Next session priority:** [one line]

## State right now
## Last session shipped
## Last session learned
## Right now in flight
## Blocked on
## Next 3 tasks
## Voice check status
## Test status
## Key file index
```

**LEARNINGS.md** -- product and build insights.

**NEXT_PROMPT.md** -- ready-to-paste session resume prompt.

---

## 27. LOOPS AND AUTOMATIONS

| Loop | Trigger | Function | Output |
|---|---|---|---|
| Daily nudge | Cron 06:00 user-local | generate-kairos-nudge | ai_nudges row |
| Squad pulse | Cron Sunday 18:00 | generate-squad-pulse | squad_pulses row |
| Squad match | Onboarding complete / squad < 4 | match-to-squad | user_squads row |
| Streak update | Check-in saved | update-streaks | user_streaks row |
| XP award | Check-in saved | award-xp | profiles.xp update |
| Weekly metrics | Cron Sunday 23:00 | compute-weekly-metrics | metrics_snapshots row |
| Nudge eval | Every deploy touching prompts | eval-nudge-quality | Pass/fail report |
| Day 84 trigger | Day 84 check-in or date | generate-cycle-reflection | ai_nudges row (cycle_reflection) |

---

## 28. KILL LIST

Cut these from v1. No debate. They return only with real data and revenue justification.

- Lifechanger tier
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

---

## 29. SESSION CONTINUITY PACK

### NEXT_PROMPT.md template

```markdown
We are building 12K, a KAIROS-framework PWA for men.

Current state: [Phase X, H+N]
Last shipped: [one sentence]
Top-1 task: [one sentence]
Blocked: [nothing / specific blocker]

Read HANDOFF.md first, then ROADMAP.md Section [N], then crack on.

Stack: Vite + React + TS + Tailwind + shadcn/ui + Supabase + Stripe + Claude Haiku.
Repo: C:\Users\ldgmc\Documents\Kairos\
PWA source: my-12k-pwa/my-12k-pwa/

British English. No em dashes. Ship it.
```

---

## 30. THE COMMANDER'S INTENT

Build one thing that makes men better. Not a data collector. Not a gamification machine. Not a wellness brand.

A system that says: here is the structure, here is the phase, here are the people beside you, here is today's one thing. Do it. Come back tomorrow.

Liam knows what it's like to start over from nothing. The product should feel like it was built by someone who has been there. Because it was.

Ship it. Verify it. Learn. Ship again. The timeline is hours, not sprints.

---

*ROADMAP.md v1.0 -- 2026-04-26 -- Kairos / 12K*
