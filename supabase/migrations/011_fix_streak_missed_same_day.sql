-- Migration 011: Fix streak not resetting when today's check-in is toggled to Missed
-- Scenario: user checks in Done (streak extends), then changes to Missed the same day.
-- Before: streak stays elevated because last_check_in_date = today, not < yesterday.
-- After: the function looks up whether yesterday had a qualifying check-in and
--        rolls the streak back correctly.

create or replace function update_streak(
  p_user_id     uuid,
  p_domain_type text,
  p_check_date  date,
  p_status      text
)
returns void as $$
declare
  v_yesterday          date := p_check_date - 1;
  v_streak_row         user_streaks%rowtype;
  v_yesterday_status   text;
begin
  insert into user_streaks (user_id, domain_type, current_streak, longest_streak, last_check_in_date)
  values (p_user_id, p_domain_type, 0, 0, null)
  on conflict (user_id, domain_type) do nothing;

  select * into v_streak_row
  from user_streaks
  where user_id = p_user_id and domain_type = p_domain_type;

  if p_status = 'Done' or p_status = 'Partial' then
    if v_streak_row.last_check_in_date = v_yesterday then
      v_streak_row.current_streak := v_streak_row.current_streak + 1;
    elsif v_streak_row.last_check_in_date = p_check_date then
      null; -- Same-day re-check: no streak change
    else
      v_streak_row.current_streak := 1;
    end if;

    v_streak_row.longest_streak     := greatest(v_streak_row.current_streak, v_streak_row.longest_streak);
    v_streak_row.last_check_in_date := p_check_date;

  elsif p_status = 'Missed' then
    if v_streak_row.last_check_in_date = p_check_date then
      -- Today's check-in was previously Done/Partial and is now Missed.
      -- Roll back: find out if yesterday had a qualifying check-in.
      select status into v_yesterday_status
      from daily_check_ins
      where user_id   = p_user_id
        and domain_type = p_domain_type
        and date        = v_yesterday
        and status in ('Done', 'Partial')
      limit 1;

      if found then
        -- Streak continues through yesterday; undo today's +1.
        v_streak_row.current_streak     := greatest(0, v_streak_row.current_streak - 1);
        v_streak_row.last_check_in_date := v_yesterday;
      else
        -- No consecutive run into yesterday; streak resets entirely.
        v_streak_row.current_streak     := 0;
        v_streak_row.last_check_in_date := null;
      end if;
    elsif v_streak_row.last_check_in_date < v_yesterday then
      -- Gap already existed before today; streak was already broken.
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
