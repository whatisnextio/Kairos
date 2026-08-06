-- 034_schedule_daily_cron_jobs.sql
-- Wires up the three pg_cron jobs that were described in edge-function comments
-- but never scheduled.
--
-- PREREQUISITE — run once in the Supabase SQL editor before applying this migration:
--
--   SELECT vault.create_secret(
--     '<your-service-role-key>',
--     'service_role_key',
--     'Service role key for cron -> edge function calls'
--   );
--
--   SELECT vault.create_secret(
--     'https://<project-ref>.supabase.co',
--     'project_url',
--     'Supabase project base URL'
--   );
--
-- Both pg_cron and pg_net must be enabled (Supabase enables them by default).

create extension if not exists pg_cron schema pg_catalog;
create extension if not exists pg_net;

-- Helper reads credentials from Vault so the key is never in plaintext SQL.
create or replace function internal.cron_http_post(path text, payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = vault, public, pg_catalog
as $$
declare
  v_url  text;
  v_role text;
begin
  select decrypted_secret into v_url  from vault.decrypted_secrets where name = 'project_url'       limit 1;
  select decrypted_secret into v_role from vault.decrypted_secrets where name = 'service_role_key'  limit 1;

  if v_url is null or v_role is null then
    raise exception 'cron_http_post: vault secrets project_url / service_role_key not set';
  end if;

  perform net.http_post(
    url     => v_url || '/functions/v1/' || path,
    headers => jsonb_build_object(
      'Content-Type',  'application/json',
      'x-service-role', v_role
    ),
    body    => payload
  );
end;
$$;

-- Remove stale schedules before (re-)creating them so the migration is idempotent.
select cron.unschedule('generate-kairos-nudge-daily')   where exists (select 1 from cron.job where jobname = 'generate-kairos-nudge-daily');
select cron.unschedule('send-daily-push-daily')         where exists (select 1 from cron.job where jobname = 'send-daily-push-daily');
select cron.unschedule('compute-weekly-metrics-sunday') where exists (select 1 from cron.job where jobname = 'compute-weekly-metrics-sunday');

-- 06:00 UTC daily — generate today's AI nudge for every active user
select cron.schedule(
  'generate-kairos-nudge-daily',
  '0 6 * * *',
  $$ select internal.cron_http_post('generate-kairos-nudge'); $$
);

-- 07:00 UTC daily — send web-push notifications using today's nudge
select cron.schedule(
  'send-daily-push-daily',
  '0 7 * * *',
  $$ select internal.cron_http_post('send-daily-push'); $$
);

-- 22:00 UTC every Sunday — aggregate weekly engagement metrics
select cron.schedule(
  'compute-weekly-metrics-sunday',
  '0 22 * * 0',
  $$ select internal.cron_http_post('compute-weekly-metrics'); $$
);
