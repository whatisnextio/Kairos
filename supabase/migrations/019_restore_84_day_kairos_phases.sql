-- Restore the public 12K/KAIROS 84-day phase model.
-- Domains stay storage-compatible with the existing eight keys; the app decides
-- which are public versus Liam-only custom routes.

alter table ai_nudges
  drop constraint if exists ai_nudges_kairos_phase_check;

update ai_nudges
set kairos_phase = case kairos_phase
  when 'GATE' then 'KICKOFF'
  when 'STABILISE' then 'ANCHOR'
  when 'BUILD' then 'RHYTHM'
  when 'PERFORM' then 'OWN'
  when 'ELITE' then 'SUSTAIN'
  else kairos_phase
end
where kairos_phase in ('GATE','STABILISE','BUILD','PERFORM','ELITE');

alter table ai_nudges
  add constraint ai_nudges_kairos_phase_check
  check (
    kairos_phase is null
    or kairos_phase in ('KICKOFF','ANCHOR','INCREASE','RHYTHM','OWN','SUSTAIN')
  );

alter table squads
  drop constraint if exists squads_kairos_phase_check;

update squads
set kairos_phase = case kairos_phase
  when 'GATE' then 'KICKOFF'
  when 'STABILISE' then 'ANCHOR'
  when 'BUILD' then 'RHYTHM'
  when 'PERFORM' then 'OWN'
  when 'ELITE' then 'SUSTAIN'
  else kairos_phase
end
where kairos_phase in ('GATE','STABILISE','BUILD','PERFORM','ELITE');

alter table squads
  add constraint squads_kairos_phase_check
  check (kairos_phase in ('KICKOFF','ANCHOR','INCREASE','RHYTHM','OWN','SUSTAIN'));
