# HANDOFF — Kairos / 12K

**Last updated:** 2026-04-26
**Session:** 3
**Next session priority:** Credentials unblock (Supabase + Stripe + Anthropic) → deploy, test live, PWA icons

---

## State right now

- **Phase 0:** Complete.
- **Phase 1:** Complete. Full scaffold, 0 TS errors.
- **Phase 2:** Complete. Migrations + 3 core Edge Functions + tests.
- **Phase 3:** Complete. TanStack hooks, ImproveScreen live, Stripe webhook, squad hooks.
- **Phase 4:** Complete. Push notifications, check-in history, DetailScreen upgraded.
- **Phase 5:** Complete. GDPR deletion, metrics Edge Function, account deletion UI.
- **Phase 6:** Complete. Deployment guide, Supabase config, cron SQL.
- **Pending:** Credentials, PWA icons, live deploy, E2E tests.

---

## Everything shipped

### Edge Functions (7 total)
| Function | Purpose |
|---|---|
| `generate-kairos-nudge` | Daily AI nudge, Claude Haiku 4.5, tier gate, cache, cost tracking |
| `match-to-squad` | Brotherhood squad matching by phase + window |
| `generate-squad-pulse` | Sunday squad pulse, Claude Sonnet 4.6 |
| `stripe-webhook` | Subscription sync (created/updated/deleted) + checkout |
| `save-push-subscription` | Web Push opt-in, saves PushSubscription JSON |
| `compute-weekly-metrics` | Weekly platform metrics snapshot |
| `delete-account` | GDPR right-to-erasure |

### Migrations (3)
| File | Tables/Objects |
|---|---|
| `001_initial_schema.sql` | 12 tables, RLS, triggers, seed data |
| `002_streak_update_function.sql` | update_streak() PL/pgSQL |
| `003_push_subscriptions.sql` | push_subscriptions table |

### Hooks (4)
| Hook | Data |
|---|---|
| `useNudge` | Generates/fetches today's nudge via Edge Function |
| `useStreaks` | Domain streaks from Supabase (brotherhood) |
| `useSquad` | Squad pulse + match-to-squad mutation |
| `useCheckIns` | Domain check-in history |

### UI
- HomeScreen: check-ins, progress bars, vibe check modal (Sundays)
- ImproveScreen: live nudge fetch, accept/dismiss/complete, free-tier blur gate
- DetailScreen: streak (remote/local by tier), 28-day history, today's status
- YouScreen: squad section, push opt-in, delete account (GDPR), squad matching
- WeeklyVibeCheckModal: 5-point rating, bottom-sheet, Supabase sync
- SubscriptionScreen: Brotherhood CTA, Stripe redirect

### Tests
- 52/52 Vitest unit tests passing
- TypeScript: 0 errors (strict mode)

---

## Blocked on (requires Liam input)

1. **Supabase project** — URL + anon key → `.env`
2. **Stripe** — Checkout link + webhook secret
3. **Anthropic API key** → Supabase Vault
4. **VAPID keys** → run `npx web-push generate-vapid-keys`, pub key → `.env`, priv key → Vault
5. **PWA icons** — `logo192.png` and `logo512.png` in `/public/`
6. **Accent green hex** — currently `#22C55E`, confirm or override

---

## Next 3 tasks (in order)

1. **Provide credentials** → run `npm run dev`, test auth + onboarding live
2. **Deploy to Vercel/Netlify** → DEPLOY.md is ready
3. **PWA icons** → any 192x192 and 512x512 PNGs in `/public/`

---

## Key files

| File | Purpose |
|---|---|
| `ROADMAP.md` | Master plan |
| `DEPLOY.md` | Deployment step-by-step |
| `supabase/config.toml` | Supabase local config + cron SQL |
| `src/types/index.ts` | All TypeScript types |
| `src/store/useAppStore.ts` | Zustand store |
| `src/pages/HomeScreen.tsx` | Check-ins + vibe check trigger |
| `src/pages/ImproveScreen.tsx` | Live AI nudge |
| `src/pages/DetailScreen.tsx` | Domain detail + history |
| `src/pages/YouScreen.tsx` | Profile + squad + notifications + delete |

## Test status

- TypeScript: 0 errors (strict)
- Unit tests: 52/52 passing (Vitest)
- E2E: not yet (Playwright configured, no tests written)
- Live deploy: not yet (credentials needed)
