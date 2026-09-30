create or replace view public.public_players
with (security_invoker = false) as
select
  p.ign as username,
  (select coalesce(jsonb_object_agg(k.name, t.code), '{}'::jsonb)
     from player_current_tiers c
     join kits k on k.id = c.kit_id
     join tier_definitions t on t.id = c.tier_id
    where c.player_id = p.id) as modes,
  (select coalesce(jsonb_object_agg(s.kit_name, s.entries), '{}'::jsonb)
     from (select k.name as kit_name,
                  jsonb_agg(jsonb_build_object(
                    'date', to_char(h.changed_at at time zone 'Europe/Prague', 'DD.MM.YYYY'),
                    'tier', t.code) order by h.changed_at, h.id) as entries
             from tier_history h
             join kits k on k.id = h.kit_id
             join tier_definitions t on t.id = h.tier_id
            where h.player_id = p.id
            group by k.name) s) as history,
  (select coalesce(jsonb_object_agg(k.name, t.code), '{}'::jsonb)
     from player_peak_tiers pp
     join kits k on k.id = pp.kit_id
     join tier_definitions t on t.id = pp.tier_id
    where pp.player_id = p.id) as peak
from players p
where p.ign !~* '^discord-[0-9]+$'
  and exists (select 1 from player_current_tiers c where c.player_id = p.id);

revoke all on public.public_players from public, anon, authenticated;
grant select on public.public_players to anon;
