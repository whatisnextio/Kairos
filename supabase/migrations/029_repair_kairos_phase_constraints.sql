-- Repair production drift where the migration ledger shows the 84-day phase
-- restore as applied, but live CHECK constraints still allow only the old
-- GATE/STABILISE/BUILD/PERFORM/ELITE phase set.

alter table public.ai_nudges
  drop constraint if exists ai_nudges_kairos_phase_check;

update public.ai_nudges
set kairos_phase = case kairos_phase
  when 'GATE' then 'KICKOFF'
  when 'STABILISE' then 'ANCHOR'
  when 'BUILD' then 'RHYTHM'
  when 'PERFORM' then 'OWN'
  when 'ELITE' then 'SUSTAIN'
  else kairos_phase
end
where kairos_phase in ('GATE','STABILISE','BUILD','PERFORM','ELITE');

alter table public.ai_nudges
  add constraint ai_nudges_kairos_phase_check
  check (
    kairos_phase is null
    or kairos_phase in ('KICKOFF','ANCHOR','INCREASE','RHYTHM','OWN','SUSTAIN')
  );

alter table public.squads
  drop constraint if exists squads_kairos_phase_check;

update public.squads
set kairos_phase = case kairos_phase
  when 'GATE' then 'KICKOFF'
  when 'STABILISE' then 'ANCHOR'
  when 'BUILD' then 'RHYTHM'
  when 'PERFORM' then 'OWN'
  when 'ELITE' then 'SUSTAIN'
  else kairos_phase
end
where kairos_phase in ('GATE','STABILISE','BUILD','PERFORM','ELITE');

alter table public.squads
  add constraint squads_kairos_phase_check
  check (kairos_phase in ('KICKOFF','ANCHOR','INCREASE','RHYTHM','OWN','SUSTAIN'));
