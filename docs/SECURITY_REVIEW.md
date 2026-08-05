# Kairos Security And Privacy Review

Reviewed for issue #52 after the MVP flow changes.

## Scope Checked

- Supabase Row Level Security for profiles, cycles, check-ins, nudges, squads,
  custom routes, push subscriptions, and admin metrics.
- Edge Function authentication for AI nudges, cycle reflections, squad matching,
  push subscription storage, account deletion, metrics, squad pulse generation,
  and the legacy Stripe webhook.
- CORS behaviour for browser-callable and admin-callable Edge Functions.
- Client-visible app-access checks versus backend enforcement.
- Local persistence, export/delete controls, notification copy, and progress
  sharing privacy.

## Controls In Place

- RLS is enabled on user-owned tables, and policies restrict user data to
  `auth.uid()`.
- Profile app-access fields are protected by `guard_profile_sensitive_fields`,
  so client tampering cannot directly set tier, XP, squad, or Stripe state.
- Custom routes are user-owned in Postgres policies, not only in the UI.
- AI nudge, cycle reflection, squad matching, push subscription, account
  deletion, and admin metrics functions validate either a user JWT or the
  service-role header before using the service-role client.
- The legacy Stripe webhook verifies the Stripe signature and timestamp, then
  acknowledges and ignores events while billing is disabled.
- Share defaults keep name, photo, and domain details private unless the user
  explicitly opts in.
- Notification payloads use coded Kairos language and do not expose private
  labels or explicit content.
- Account deletion requires a signed-in POST, removes the auth user through the
  admin API, and the client clears the persisted app store after success.

## Hardening Applied

- Added `supabase/functions/_shared/cors.ts` with an explicit origin allowlist
  for:
  - `https://www.12k.app`
  - `https://12k.app`
  - production and preview Vercel Kairos hosts
  - local Vite development hosts
- Removed wildcard `Access-Control-Allow-Origin: *` from browser/admin-callable
  Supabase Edge Functions.
- Added CORS headers to normal JSON and text responses, not only preflight
  responses, so browser errors remain readable while origins stay restricted.
- Kept the Stripe webhook out of browser CORS handling because it is a signed
  server-to-server endpoint, and changed it to a no-op while billing is off.

## Residual Risk

- The app persists profile, progress, route, notification, share, and image
  state in local browser storage for offline/PWA use. That is acceptable for V1,
  but a shared or compromised device can expose local app data.
- The profile image is stored as a local data URL, not cloud storage. This
  avoids public object permissions for now, but it increases local storage
  sensitivity.
- Hosted Supabase migration state was not re-read in this review environment, so
  live RLS proof still depends on Supabase project access.
- The legacy Stripe webhook remains a signed server-to-server no-op, so old
  Stripe deliveries are acknowledged without changing app access.

## Recommendation

- Treat this as MVP hardening, not a penetration test.
- Before any future paid launch, run a live Supabase audit with project credentials:
  `pg_policies`, function env presence, Edge Function deployment versions, and a
  real non-owner tampering test.
- Keep all future browser-callable functions on the shared CORS helper and add a
  source test before merging them.
