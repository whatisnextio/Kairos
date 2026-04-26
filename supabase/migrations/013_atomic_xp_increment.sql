-- Migration 013: Atomic XP increment to prevent race condition
-- Previously, XP was synced as an absolute value (current_local_xp + delta).
-- If two operations (e.g., two check-ins, or a check-in + nudge completion)
-- landed concurrently, each captured the pre-update XP from their Zustand closure.
-- Both then wrote the same absolute value, and the last write silently ate the
-- first op's XP. On next bootstrap the correct local state was overwritten.
-- This function increments atomically so every write is additive.

create or replace function increment_profile_xp(p_user_id uuid, p_delta integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set xp = greatest(0, xp + p_delta)
  where id = p_user_id;
end;
$$;

grant execute on function increment_profile_xp(uuid, integer) to authenticated;
