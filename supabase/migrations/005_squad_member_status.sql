-- 005_squad_member_status.sql
-- SECURITY DEFINER function that returns anonymised check-in dots for
-- all members in the calling user's squad. Only returns data for today.
-- Real names and UUIDs are never exposed; only anchor initial + status.

create or replace function get_squad_members_status()
returns table (
  member_index  integer,
  anchor_initial text,
  body_status   text,
  love_status   text,
  mission_status text,
  spirit_status text
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
    upper(left(coalesce(p.custom_anchor_name, ia.name), 1)) as anchor_initial,
    max(case when dci.domain_type = 'BODY'    then dci.status end) as body_status,
    max(case when dci.domain_type = 'LOVE'    then dci.status end) as love_status,
    max(case when dci.domain_type = 'MISSION' then dci.status end) as mission_status,
    max(case when dci.domain_type = 'SPIRIT'  then dci.status end) as spirit_status
  from profiles p
  left join identity_anchors ia on ia.id = p.identity_anchor_id
  left join daily_check_ins dci
    on dci.user_id = p.id
    and dci.date = v_today
  where p.squad_id = v_squad_id
  group by p.id, p.created_at, ia.name, p.custom_anchor_name;
end;
$$;

grant execute on function get_squad_members_status() to authenticated;
