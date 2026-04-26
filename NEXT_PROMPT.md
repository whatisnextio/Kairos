We are building 12K, a KAIROS-framework PWA for men. 84-day transformation system.

Current state: All 6 phases shipped. Feature-complete for soft launch. Blocked only on credentials.
Last shipped: Pre-commit hook + GitHub Actions CI + Day 84 flow + progressive domain setup + admin metrics
Top-1 task: Credential unblock and live deployment (see DEPLOY.md)

Read HANDOFF.md first, then crack on.

Stack: Vite + React + TS + Tailwind + Supabase + Stripe + Claude Haiku/Sonnet
Repo: C:\Users\ldgmc\Documents\Kairos\
52 unit tests passing. E2E specs written (require live Supabase).
Pre-commit hook: tsc + voice check + vitest on every commit.

Blocked on: Supabase URL/key, Anthropic API key, Stripe URLs/secrets, VAPID keys, PWA icons.

Once credentials arrive:
1. cp .env.example .env && fill in values
2. supabase db push (4 migrations)
3. supabase secrets set ANTHROPIC_API_KEY=... STRIPE_WEBHOOK_SECRET=... VAPID_PRIVATE_KEY=...
4. supabase functions deploy --all
5. npm run build && vercel --prod

British English. No em dashes. Ship it.
