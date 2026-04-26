-- Atomic squad member count increment RPC.
-- Returns TRUE if the increment succeeded, FALSE if the squad was already full.
-- Uses member_count + 1 in-place SQL to avoid lost-update races where two
-- concurrent callers both read the same stale count and write the same value.
create or replace function increment_squad_member_count(p_squad_id uuid, p_max integer default 8)
returns boolean language plpgsql security definer as $$
declare
  rows_updated integer;
begin
  update squads
  set member_count = member_count + 1
  where id = p_squad_id
    and member_count < p_max;
  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$$;
