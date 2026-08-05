-- Store AI provider costs as fractional GBP pence.
-- Earlier Edge Functions multiplied USD cost by 100 twice, so existing
-- positive estimates were inflated by roughly two orders of magnitude.

alter table public.ai_nudges
  alter column cost_pence type numeric(12,4)
  using cost_pence::numeric;

update public.ai_nudges
set cost_pence = round(
  cost_pence / case
    when type = 'cycle_reflection' then 125
    else 100
  end,
  4
)
where cost_pence is not null
  and cost_pence > 0;

comment on column public.ai_nudges.cost_pence is
  'Estimated provider cost in GBP pence. Fractional values are expected for short AI calls.';
