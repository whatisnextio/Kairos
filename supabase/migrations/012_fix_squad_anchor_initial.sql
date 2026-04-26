-- Migration 012: Fix squad member anchor_initial always being 'T'
-- All standard identity anchors have names like "The Provider", so taking
-- left(name, 1) produces 'T' for everyone. Use identity_anchor_id instead,
-- which gives distinct initials: P B G L M C. Custom users keep their own
-- first letter.

create or replace function get_squad_members_status()
returns table (
  member_index   integer,
  anchor_initial text,
  body_status    text,
  love_status    text,
  mission_status text,
  spirit_status  text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squad_id uuid;
  v_today    date := current_date;
begin
  select squad_id into v_squad_id
  from profiles
  where id = auth.uid();

  if v_squad_id is null then
    return;
  end if;

  return query
  select
    (row_number() over (order by p.created_at))::integer as member_index,
    upper(left(
      case
        when p.identity_anchor_id = 'custom' then coalesce(p.custom_anchor_name, 'C')
        else p.identity_anchor_id
      end,
    1)) as anchor_initial,
    max(case when dci.domain_type = 'BODY'    then dci.status end) as body_status,
    max(case when dci.domain_type = 'LOVE'    then dci.status end) as love_status,
    max(case when dci.domain_type = 'MISSION' then dci.status end) as mission_status,
    max(case when dci.domain_type = 'SPIRIT'  then dci.status end) as spirit_status
  from profiles p
  left join daily_check_ins dci
    on dci.user_id = p.id
   and dci.date = v_today
  where p.squad_id = v_squad_id
  group by p.id, p.created_at, p.identity_anchor_id, p.custom_anchor_name;
end;
$$;

grant execute on function get_squad_members_status() to authenticated;
