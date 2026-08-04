-- 018_harden_handle_new_user.sql
-- Fixes "Database error saving new user" on registration/magic-link send.
--
-- Root cause: the handle_new_user trigger inserts with identity_anchor_id = 'custom'
-- which requires a matching row in identity_anchors. If the seed data is absent the
-- FK constraint fails, rolling back the auth.users insert and surfacing this error.
--
-- Fix:
--   1. Re-seed identity_anchors (idempotent — ON CONFLICT DO NOTHING).
--   2. Rewrite handle_new_user with an exception handler so auth user creation
--      can never fail due to a profile-insert error.
--   3. Add set search_path = public for security hygiene.

-- ─── 1. Ensure reference data exists ─────────────────────────────────────────

insert into public.identity_anchors (id, name, description) values
  ('provider', 'The Provider',  'You show up. Every day. No excuses.'),
  ('builder',  'The Builder',   'You make things real that others only imagine.'),
  ('guardian', 'The Guardian',  'You protect what matters. Family, health, standards.'),
  ('leader',   'The Leader',    'Others follow because you go first.'),
  ('mentor',   'The Mentor',    'Your hard-won lessons become someone else''s shortcut.'),
  ('creator',  'The Creator',   'You build worlds with your hands or mind.'),
  ('custom',   'Custom',        'Define your own.')
on conflict (id) do nothing;

-- ─── 2. Harden the trigger function ──────────────────────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, identity_anchor_id, date_of_birth)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'New user'),
    'custom',
    coalesce(
      case
        when (new.raw_user_meta_data->>'date_of_birth') is not null
         and (new.raw_user_meta_data->>'date_of_birth') <> ''
        then (new.raw_user_meta_data->>'date_of_birth')::date
      end,
      current_date
    )
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Profile insert failed (e.g. transient constraint). Log and allow auth to proceed.
  -- OnboardingFlow uses upsert, so the profile will be created on first sign-in.
  raise warning '[handle_new_user] skipped profile for user %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer
   set search_path = public;
