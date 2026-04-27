# DEPLOY — Kairos / 12K

Steps to go from zero to live. In order.

---

## 1. Supabase Project

1. Create project at supabase.com — **EU region (eu-west-2)**
2. Copy `Project URL` → `VITE_SUPABASE_URL` in `.env`
3. Copy `anon public` key → `VITE_SUPABASE_ANON_KEY` in `.env`
4. Copy `service_role` key → used in Supabase Vault (NOT in .env)

## 2. Database Migrations

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This runs all 15 migrations in `supabase/migrations/` in order. Key ones:
- `001_initial_schema.sql` — all core tables + RLS + triggers
- `002_streak_update_function.sql` — update_streak() function
- `005_squad_member_status.sql` — SECURITY DEFINER get_squad_members_status()
- `013_atomic_xp_increment.sql` — increment_profile_xp() RPC
- `014_increment_squad_member_count.sql` — increment_squad_member_count() RPC
- `015_subscription_period.sql` — cancel_at_period_end + current_period_end columns

## 3. Supabase Vault Secrets

In Supabase dashboard → Project Settings → Edge Functions → Secrets:

| Secret name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... |
| `STRIPE_WEBHOOK_SECRET` | whsec_... |
| `VAPID_PRIVATE_KEY` | (from npx web-push generate-vapid-keys) |
| `STRIPE_SECRET_KEY` | sk_live_... (optional — used by compute-weekly-metrics for MRR; omit to show MRR as N/A) |

## 4. Edge Functions

```bash
npx supabase functions deploy generate-kairos-nudge
npx supabase functions deploy generate-cycle-reflection
npx supabase functions deploy match-to-squad
npx supabase functions deploy generate-squad-pulse
npx supabase functions deploy stripe-webhook
npx supabase functions deploy save-push-subscription
npx supabase functions deploy send-daily-push
npx supabase functions deploy compute-weekly-metrics
npx supabase functions deploy delete-account
```

## 5. Stripe

1. Create product: "Brotherhood" — £7.99/month recurring
2. Copy Checkout link → `VITE_STRIPE_CHECKOUT_URL` in `.env`
3. Add webhook endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
4. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET` in Supabase Vault

## 6. Web Push VAPID

```bash
npx web-push generate-vapid-keys
```

- Public key → `VITE_VAPID_PUBLIC_KEY` in `.env`
- Private key → `VAPID_PRIVATE_KEY` in Supabase Vault

## 7. Supabase Cron Jobs

Run in Supabase SQL editor (requires pg_cron extension):

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily nudge (06:00 UTC)
SELECT cron.schedule(
  'daily-nudge-cron',
  '0 6 * * *',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-kairos-nudge', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);

-- Weekly squad pulse (Sundays 08:00 UTC)
SELECT cron.schedule(
  'weekly-squad-pulse',
  '0 8 * * 0',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-squad-pulse', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);

-- Daily push notifications (07:00 UTC — fires after nudge generation at 06:00)
SELECT cron.schedule(
  'daily-push-cron',
  '0 7 * * *',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-daily-push', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);

-- Weekly metrics (Sundays 22:00 UTC)
SELECT cron.schedule(
  'weekly-metrics',
  '0 22 * * 0',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/compute-weekly-metrics', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);
```

## 8. Frontend Build and Deploy

```bash
npm run build
```

Deploy `dist/` to Vercel, Netlify, or any static host.

Environment variables for production (in host dashboard):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_CHECKOUT_URL`
- `VITE_STRIPE_PORTAL_URL`
- `VITE_VAPID_PUBLIC_KEY`

## 9. Verify

- [ ] Auth: register, magic link, sign out
- [ ] Onboarding: complete Day 0 win flow, first XP awarded
- [ ] Check-ins: all 4 domains, all statuses
- [ ] Nudge: ImproveScreen loads nudge (brotherhood)
- [ ] Stripe: checkout → subscription → tier upgrade synced
- [ ] Squad: match-to-squad, pulse on Sunday
- [ ] Push: opt-in, receive notification
- [ ] GDPR: delete account removes all data
