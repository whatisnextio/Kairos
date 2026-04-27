-- Add subscription period columns to profiles.
-- Used to display "cancels on X" UI and detect cancel_at_period_end state
-- without a Stripe API call.

alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_end    timestamptz;
