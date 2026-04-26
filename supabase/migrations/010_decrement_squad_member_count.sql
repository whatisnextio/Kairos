-- Migration 010: RPC helper to safely decrement squads.member_count
-- Used by delete-account edge function so the count stays accurate when a user leaves.

create or replace function decrement_squad_member_count(p_squad_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update squads
  set member_count = greatest(0, member_count - 1)
  where id = p_squad_id;
end;
$$;
