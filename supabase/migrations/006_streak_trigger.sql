-- 006_streak_trigger.sql
-- Fires update_streak automatically after every check-in write to daily_check_ins.
-- Replaces the need for the app or edge functions to call update_streak() via RPC.

create or replace function trigger_update_streak()
returns trigger as $$
begin
  perform update_streak(
    NEW.user_id,
    NEW.domain_type,
    NEW.date::date,
    NEW.status
  );
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists after_check_in_upsert on daily_check_ins;

create trigger after_check_in_upsert
  after insert or update on daily_check_ins
  for each row
  execute function trigger_update_streak();
