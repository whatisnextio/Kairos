-- 002_streak_update_function.sql
-- Called by the check-in upsert to keep streaks current.
-- Runs as security definer so it can write user_streaks from Edge Functions.

create or replace function update_streak(
  p_user_id     uuid,
  p_domain_type text,
  p_check_date  date,
  p_status      text
)
returns void as $$
declare
  v_yesterday   date := p_check_date - 1;
  v_streak_row  user_streaks%rowtype;
begin
  -- Upsert streak row
  insert into user_streaks (user_id, domain_type, current_streak, longest_streak, last_check_in_date)
  values (p_user_id, p_domain_type, 0, 0, null)
  on conflict (user_id, domain_type) do nothing;

  select * into v_streak_row
  from user_streaks
  where user_id = p_user_id and domain_type = p_domain_type;

  if p_status = 'Done' or p_status = 'Partial' then
    if v_streak_row.last_check_in_date = v_yesterday then
      -- Extend streak
      v_streak_row.current_streak := v_streak_row.current_streak + 1;
    elsif v_streak_row.last_check_in_date = p_check_date then
      -- Same day re-check, no change to streak count
      null;
    else
      -- Gap: restart streak
      v_streak_row.current_streak := 1;
    end if;

    v_streak_row.longest_streak := greatest(v_streak_row.current_streak, v_streak_row.longest_streak);
    v_streak_row.last_check_in_date := p_check_date;
  elsif p_status = 'Missed' then
    if v_streak_row.last_check_in_date < v_yesterday then
      v_streak_row.current_streak := 0;
    end if;
  end if;

  update user_streaks
  set
    current_streak     = v_streak_row.current_streak,
    longest_streak     = v_streak_row.longest_streak,
    last_check_in_date = v_streak_row.last_check_in_date
  where user_id = p_user_id and domain_type = p_domain_type;
end;
$$ language plpgsql security definer;
