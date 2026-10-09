-- Demo seed (SPEC.md §7). Every demo row is is_demo = true or uses an @example.com account.
-- Real places come from `pnpm import:osm florianopolis`, never from here.

-- City ----------------------------------------------------------------------
insert into cities (id, slug, name, state, center_lat, center_lng, zoom, bbox) values
  ('00000000-0000-4000-8000-000000000001', 'santos', 'Santos', 'SP',
   -23.9640, -46.3290, 13.2, '{-46.40,-24.00,-46.29,-23.91}'),
  ('00000000-0000-4000-8000-000000000002', 'florianopolis', 'Florianópolis', 'SC',
   -27.5954, -48.5480, 11.5, '{-48.62,-27.85,-48.33,-27.38}')
on conflict (slug) do update set
  name = excluded.name, state = excluded.state, center_lat = excluded.center_lat,
  center_lng = excluded.center_lng, zoom = excluded.zoom, bbox = excluded.bbox;

-- Demo accounts (cannot sign in: example.com mailboxes do not exist) --------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '',
       now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', u.name),
       now(), now(), '', '', '', ''
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, 'ana.demo@example.com',      'Ana (Demo)'),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, 'bruno.demo@example.com',    'Bruno (Demo)'),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, 'carla.demo@example.com',    'Carla (Demo)'),
  ('00000000-0000-4000-8000-0000000000a4'::uuid, 'admin.demo@example.com',    'Admin (Demo)'),
  ('00000000-0000-4000-8000-0000000000a5'::uuid, 'parceiro.demo@example.com', 'Parceiro (Demo)')
) as u(id, email, name)
on conflict (id) do nothing;

insert into profiles (id, display_name, bio, home_country, languages, role, verified,
                      current_city_id, neighborhood, share_presence, stay_from, stay_to) values
  ('00000000-0000-4000-8000-0000000000a1', 'Ana (Demo)', 'Perfil de demonstração. Designer remota, 1 mês em Santos.',
   'BR', '{pt,en}', 'nomad', true, '00000000-0000-4000-8000-000000000001', 'Gonzaga', true,
   current_date - 10, current_date + 30),
  ('00000000-0000-4000-8000-0000000000a2', 'Bruno (Demo)', 'Perfil de demonstração. Dev back-end.',
   'BR', '{pt}', 'nomad', true, '00000000-0000-4000-8000-000000000001', 'Gonzaga', true,
   current_date - 5, current_date + 40),
  ('00000000-0000-4000-8000-0000000000a3', 'Carla (Demo)', 'Perfil de demonstração. Visto VITEM XIV.',
   'PT', '{pt,en,es}', 'nomad', true, '00000000-0000-4000-8000-000000000001', 'Gonzaga', true,
   current_date - 2, current_date + 25),
  ('00000000-0000-4000-8000-0000000000a4', 'Admin (Demo)', null,
   'BR', '{pt}', 'admin', true, null, null, false, null, null),
  ('00000000-0000-4000-8000-0000000000a5', 'Parceiro (Demo)', null,
   'BR', '{pt}', 'partner', true, null, null, false, null, null)
on conflict (id) do update set
  display_name = excluded.display_name, bio = excluded.bio, home_country = excluded.home_country,
  languages = excluded.languages, role = excluded.role, verified = excluded.verified,
  current_city_id = excluded.current_city_id, neighborhood = excluded.neighborhood,
  share_presence = excluded.share_presence, stay_from = excluded.stay_from, stay_to = excluded.stay_to;

insert into partners (id, owner_id, business_name, document_type, approved, plan) values
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a5',
   'Negócio Demo', 'mei', true, 'free');

-- Demo places (fictitious names, approximate neighborhood coordinates) -------
insert into places (id, city_id, partner_id, name, category, subcategory, lat, lng, neighborhood,
                    description, opening_hours, has_power_outlets, quiet_level, price_hint,
                    featured_until, is_demo) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000b1', 'Cowork Demo Gonzaga', 'work', 'coworking',
   -23.9655, -46.3338, 'Gonzaga', 'Lugar fictício para demonstração.', 'Mo-Fr 08:00-20:00; Sa 09:00-14:00',
   true, 4, '$$', now() + interval '30 days', true),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000b1', 'Café Demo Centro Histórico', 'work', 'cafe',
   -23.9342, -46.3262, 'Centro', 'Lugar fictício para demonstração.', 'Mo-Sa 08:00-18:00',
   true, 3, '$', null, true),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000b1', 'Cowork Demo Ponta da Praia', 'work', 'coworking',
   -23.9822, -46.3048, 'Ponta da Praia', 'Lugar fictício para demonstração.', 'Mo-Fr 09:00-19:00',
   true, 5, '$$', null, true);

-- Demo check-ins in three freshness states (SPEC_V2 §11; same rows as src/lib/demoCheckins.ts):
-- Gonzaga recent (Selo + "Pronto para chamadas"), Ponta da Praia 70 days (seal expired), Centro 120 days.
insert into place_checkins (place_id, user_id, download_mbps, upload_mbps, ping_ms, jitter_ms, loss_pct, measured,
                            on_venue_wifi, near_place, outlets_level, noise_level, call_result, stay_policy, created_at) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 92, 38, 14, 3, 0, true, true, true, 'many', 4, 'ok', 'pass_required', now() - interval '25 days'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', 105, 41, 12, 2, 0, true, true, true, 'many', 5, 'ok', 'pass_required', now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a1', 61, 20, 18, 5, 0, true, true, true, 'many', 5, 'ok', 'pass_required', now() - interval '72 days'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a3', 57, 18, 19, 6, 0, true, true, true, 'few', 4, 'ok', 'pass_required', now() - interval '70 days'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a2', 38, 8, 25, 9, 0, true, true, true, 'few', 3, 'choppy', 'min_consumption', now() - interval '122 days'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a3', 44, 9, 22, 8, 0, true, true, true, 'few', 3, 'ok', 'min_consumption', now() - interval '120 days');
select recompute_place(id) from places where is_demo;

insert into offers (place_id, kind, title, description, code, valid_from, valid_to, capacity) values
  ('00000000-0000-4000-8000-0000000000c1', 'day_pass', 'Diária com 20% de desconto (Demo)',
   'Oferta fictícia de demonstração.', 'DEMO20', current_date, current_date + 60, 10),
  ('00000000-0000-4000-8000-0000000000c2', 'discount', 'Café coado + pão na chapa por R$ 12 (Demo)',
   'Oferta fictícia de demonstração.', 'DEMOCAFE', current_date, current_date + 60, null),
  ('00000000-0000-4000-8000-0000000000c3', 'package', 'Semana de cowork (Demo)',
   'Oferta fictícia de demonstração.', 'DEMOSEMANA', current_date, current_date + 60, 5),
  ('00000000-0000-4000-8000-0000000000c3', 'slot', 'Sala de reunião 1 h grátis (Demo)',
   'Oferta fictícia de demonstração.', 'DEMOSALA', current_date, current_date + 30, 3);

-- Demo activities in the next 7 days at public spots in Santos; `starts` is days + local
-- time after today's midnight in America/Sao_Paulo, so hours look natural in the demo.
insert into activities (city_id, creator_id, place_id, title, description, category, starts_at, ends_at,
                        meeting_lat, meeting_lng, meeting_label, capacity, cost_total_cents, split_cost, is_demo)
select '00000000-0000-4000-8000-000000000001', a.creator, a.place, a.title, 'Atividade de demonstração.',
       a.category,
       (date_trunc('day', now() at time zone 'America/Sao_Paulo') + a.starts) at time zone 'America/Sao_Paulo',
       (date_trunc('day', now() at time zone 'America/Sao_Paulo') + a.starts + a.duration) at time zone 'America/Sao_Paulo',
       a.lat, a.lng, a.label, a.capacity, a.cost, a.cost is not null, true
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, '00000000-0000-4000-8000-0000000000c1'::uuid,
   'Dia de trabalho conjunto (Demo)', 'work_together', interval '1 day 9 hours', interval '8 hours',
   -23.9655, -46.3338, 'Cowork Demo Gonzaga', 6, null::int),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, null::uuid,
   'Pôr do sol na Ponta da Praia (Demo)', 'meetup', interval '1 day 17 hours 30 minutes', interval '2 hours',
   -23.9868, -46.3010, 'Mureta da Ponta da Praia', 12, null),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, null::uuid,
   'Pedal pela ciclovia da orla (Demo)', 'outdoor', interval '2 days 7 hours', interval '2 hours',
   -23.9720, -46.3500, 'Emissário Submarino, José Menino', 10, null),
  ('00000000-0000-4000-8000-0000000000a1'::uuid, null::uuid,
   'Café na Bolsa Oficial de Café (Demo)', 'culture', interval '2 days 15 hours', interval '2 hours',
   -23.9338, -46.3277, 'Bolsa Oficial de Café, Centro', 6, 18000),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, '00000000-0000-4000-8000-0000000000c3'::uuid,
   'Cowork + mergulho no fim da tarde (Demo)', 'work_together', interval '3 days 10 hours', interval '7 hours',
   -23.9822, -46.3048, 'Cowork Demo Ponta da Praia', 5, null),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, null::uuid,
   'Subida ao Monte Serrat (Demo)', 'outdoor', interval '4 days 9 hours', interval '3 hours',
   -23.9356, -46.3307, 'Praça Correia de Mello, estação do funicular', 8, 16000),
  ('00000000-0000-4000-8000-0000000000a1'::uuid, null::uuid,
   'Travessia de balsa até o Guarujá (Demo)', 'tour', interval '5 days 10 hours', interval '4 hours',
   -23.9862, -46.2990, 'Terminal da balsa, Ponta da Praia', 10, null),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, null::uuid,
   'Visita ao Museu Pelé no Valongo (Demo)', 'culture', interval '6 days 14 hours', interval '3 hours',
   -23.9312, -46.3329, 'Largo Marquês de Monte Alegre, Valongo', 15, 30000)
) as a(creator, place, title, category, starts, duration, lat, lng, label, capacity, cost);
