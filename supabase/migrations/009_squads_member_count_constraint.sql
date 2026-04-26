-- Migration 009: Add check constraint on squads.member_count
-- Prevents race-condition overfill beyond the 8-member cap at the DB level.

alter table squads
  add constraint squads_member_count_max
  check (member_count between 0 and 8);
