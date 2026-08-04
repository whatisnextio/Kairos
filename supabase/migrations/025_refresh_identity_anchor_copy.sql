-- Refresh visible identity-anchor copy without changing stable IDs.
insert into public.identity_anchors (id, name, description) values
  ('provider', 'The Provider', 'You create stability through money, energy, and daily presence.'),
  ('builder', 'The Builder', 'You turn plans into systems, shipped work, and visible progress.'),
  ('guardian', 'The Guardian', 'You protect health, family, boundaries, and the standards that hold.'),
  ('leader', 'The Leader', 'You set direction, make decisions, and bring others with you.'),
  ('mentor', 'The Mentor', 'You use earned lessons to guide, teach, and steady someone else.'),
  ('creator', 'The Creator', 'You make art, stories, photos, or content that carries meaning.'),
  ('custom', 'Custom', 'Use your own words if none of these fit.')
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description;
