We are building 12K, a KAIROS-framework PWA for men. 84-day transformation system.

Current state: Feature-complete. 52/52 tests passing. TypeScript clean. Bundle 66 kB. 25 commits not pushed.
Last shipped: DetailScreen local history for free tier, ProgressScreen streaks, pb-safe CSS, code splitting, XP fixes, squad tiles, stale check-in clearing, AbandonCycleModal.
Top-1 task: Credential unblock and live deployment.

Read HANDOFF.md first, then crack on.

Stack: Vite + React + TS + Tailwind + Supabase + Stripe + Claude Haiku/Sonnet
Repo: C:\Users\ldgmc\Documents\Kairos\
52 unit tests passing (src/tests/kairos.test.ts + gamification.test.ts).
Pre-commit hook: tsc + voice check + vitest on every commit.

Blocked on: Supabase URL/key, Anthropic API key, Stripe URLs/secrets, VAPID keys, real PWA icons.

Once credentials arrive:
1. cp .env.example .env && fill in values
2. supabase db push (5 migrations)
3. supabase secrets set ANTHROPIC_API_KEY=... STRIPE_WEBHOOK_SECRET=... VAPID_PRIVATE_KEY=...
4. supabase functions deploy --all
5. npm run build && vercel --prod
6. git push origin main (25 commits ahead of origin)

British English. No em dashes. Ship it.
