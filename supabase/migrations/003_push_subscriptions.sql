-- 003_push_subscriptions.sql
-- Table for Web Push API subscriptions.
-- One row per user (latest device wins via upsert).

create table push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (user_id)
);

alter table push_subscriptions enable row level security;

create policy "Users manage own push subscription"
  on push_subscriptions for all
  using (auth.uid() = user_id);

create policy "Service role manages push subscriptions"
  on push_subscriptions for all
  using (auth.role() = 'service_role');

create trigger push_subscriptions_updated_at
  before update on push_subscriptions
  for each row execute function update_updated_at();
