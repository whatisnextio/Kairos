# DEPLOY - Kairos / 12K

Steps to go from zero to live. In order.

## 1. Supabase Project

1. Create project at supabase.com in the EU region.
2. Copy `Project URL` to `VITE_SUPABASE_URL` in `.env`.
3. Copy the `anon public` key to `VITE_SUPABASE_ANON_KEY` in `.env`.
4. Keep the `service_role` key out of `.env`; use it only in Supabase secrets or trusted server jobs.

## 2. Database Migrations

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

This runs the migrations in `supabase/migrations/` in order. Key migrations:

- `001_initial_schema.sql` - core tables, RLS, triggers, and admin metrics.
- `003_push_subscriptions.sql` - Web Push subscription storage.
- `004_cycle_reflections.sql` - cycle reflection storage.
- `013_atomic_xp_increment.sql` - `increment_profile_xp()` RPC.
- `014_increment_squad_member_count.sql` - squad member count RPC.
- `021_custom_routes.sql` - user custom route tables.
- `022_notification_preferences.sql` - notification preferences.
- `024_harden_profile_sensitive_updates.sql` - sensitive profile-field guard.
- `026_harden_admin_metrics_auth.sql` - admin-only metrics reads.
- `027_single_app_access.sql` - single app access defaults and custom-route policy cleanup.

## 3. Supabase Edge Function Secrets

In Supabase Dashboard > Project Settings > Edge Functions > Secrets:

| Secret name | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI nudges/reflections |
| `VAPID_PRIVATE_KEY` | Private key from `npx web-push generate-vapid-keys` |
| `ADMIN_EMAILS` | Comma-separated admin email allowlist |
| `STRIPE_WEBHOOK_SECRET` | Optional legacy secret only if old Stripe webhooks are still configured |

The app currently has no paid/premium model. The legacy `stripe-webhook` function is a signed no-op so old deliveries can be acknowledged without changing profiles.

## 4. Edge Functions

```bash
npx supabase functions deploy generate-kairos-nudge
npx supabase functions deploy generate-cycle-reflection
npx supabase functions deploy match-to-squad
npx supabase functions deploy generate-squad-pulse
npx supabase functions deploy save-push-subscription
npx supabase functions deploy send-daily-push
npx supabase functions deploy compute-weekly-metrics
npx supabase functions deploy delete-account
npx supabase functions deploy stripe-webhook
```

## 5. Web Push VAPID

```bash
npx web-push generate-vapid-keys
```

- Public key -> `VITE_VAPID_PUBLIC_KEY` in `.env`.
- Private key -> `VAPID_PRIVATE_KEY` in Supabase Edge Function secrets.

## 6. Supabase Cron Jobs

Run in Supabase SQL editor after enabling `pg_cron` and `pg_net`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'daily-nudge-cron',
  '0 6 * * *',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-kairos-nudge', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);

SELECT cron.schedule(
  'weekly-squad-pulse',
  '0 8 * * 0',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/generate-squad-pulse', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);

SELECT cron.schedule(
  'daily-push-cron',
  '0 7 * * *',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-daily-push', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);

SELECT cron.schedule(
  'weekly-metrics',
  '0 22 * * 0',
  $$ SELECT net.http_post(url := 'https://YOUR_PROJECT.supabase.co/functions/v1/compute-weekly-metrics', headers := '{"x-service-role": "YOUR_SERVICE_ROLE_KEY"}'::jsonb, body := '{}'::jsonb); $$
);
```

## 7. Frontend Build And Deploy

```bash
npm run build
```

Deploy `dist/` to Vercel or the configured static host.

Production environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`
- `VITE_SENTRY_DSN` (optional)

## 8. Verify

- Auth: register, magic link, sign out.
- Onboarding: complete Day 0 win flow, first XP awarded.
- PWA restart: completed onboarding loads the active app, not onboarding again.
- Check-ins: all four domains and all statuses.
- AI nudge: Improve loads a nudge for app users.
- Squad: match-to-squad and weekly pulse.
- Push: opt in, save preferences, receive notification.
- Custom routes: add, display, and check in against a personal route.
- GDPR: delete account removes user data and clears local app state.
