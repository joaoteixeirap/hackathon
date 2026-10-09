-- Demo seed (SPEC.md §7). Every demo row is is_demo = true or uses an @example.com account.
-- Real places come from `pnpm import:osm florianopolis`, never from here.

-- City ----------------------------------------------------------------------
insert into cities (id, slug, name, state, center_lat, center_lng, zoom, bbox) values
  ('00000000-0000-4000-8000-000000000001', 'florianopolis', 'Florianópolis', 'SC',
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
  ('00000000-0000-4000-8000-0000000000a1', 'Ana (Demo)', 'Perfil de demonstração. Designer remota.',
   'BR', '{pt,en}', 'nomad', true, '00000000-0000-4000-8000-000000000001', 'Lagoa da Conceição', true,
   current_date - 10, current_date + 30),
  ('00000000-0000-4000-8000-0000000000a2', 'Bruno (Demo)', 'Perfil de demonstração. Dev back-end.',
   'BR', '{pt}', 'nomad', true, '00000000-0000-4000-8000-000000000001', 'Lagoa da Conceição', true,
   current_date - 5, current_date + 40),
  ('00000000-0000-4000-8000-0000000000a3', 'Carla (Demo)', 'Perfil de demonstração. Visto VITEM XIV.',
   'PT', '{pt,en,es}', 'nomad', true, '00000000-0000-4000-8000-000000000001', 'Lagoa da Conceição', true,
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
   '00000000-0000-4000-8000-0000000000b1', 'Cowork Demo Centro', 'work', 'coworking',
   -27.5960, -48.5505, 'Centro', 'Lugar fictício para demonstração.', 'Mo-Fr 08:00-20:00',
   true, 4, '$$', now() + interval '30 days', true),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000b1', 'Café Demo Lagoa', 'work', 'cafe',
   -27.6025, -48.4705, 'Lagoa da Conceição', 'Lugar fictício para demonstração.', 'Mo-Su 08:00-19:00',
   true, 3, '$', null, true),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000b1', 'Cowork Demo Campeche', 'work', 'coworking',
   -27.6770, -48.4855, 'Campeche', 'Lugar fictício para demonstração.', 'Mo-Sa 09:00-18:00',
   true, 5, '$$', null, true);

-- Two Wi-Fi tests per place from demo users → recompute_wifi grants the Selo.
insert into wifi_tests (place_id, user_id, download_mbps, ping_ms, created_at) values
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a1', 92, 14, now() - interval '3 days'),
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a2', 105, 12, now() - interval '1 day'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a2', 38, 25, now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000a3', 44, 22, now() - interval '5 hours'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a1', 61, 18, now() - interval '4 days'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-0000000000a3', 57, 19, now() - interval '2 days');

insert into offers (place_id, kind, title, description, code, valid_from, valid_to, capacity) values
  ('00000000-0000-4000-8000-0000000000c1', 'day_pass', 'Diária com 20% de desconto (Demo)',
   'Oferta fictícia de demonstração.', 'DEMO20', current_date, current_date + 60, 10),
  ('00000000-0000-4000-8000-0000000000c2', 'discount', 'Café + pão de queijo por R$ 10 (Demo)',
   'Oferta fictícia de demonstração.', 'DEMOCAFE', current_date, current_date + 60, null),
  ('00000000-0000-4000-8000-0000000000c3', 'package', 'Semana de cowork (Demo)',
   'Oferta fictícia de demonstração.', 'DEMOSEMANA', current_date, current_date + 60, 5),
  ('00000000-0000-4000-8000-0000000000c3', 'slot', 'Sala de reunião 1 h grátis (Demo)',
   'Oferta fictícia de demonstração.', 'DEMOSALA', current_date, current_date + 30, 3);

-- Demo activities in the next 7 days, at public spots ---------------------
insert into activities (city_id, creator_id, place_id, title, description, category, starts_at, ends_at,
                        meeting_lat, meeting_lng, meeting_label, capacity, cost_total_cents, split_cost, is_demo)
select '00000000-0000-4000-8000-000000000001', a.creator, a.place, a.title, 'Atividade de demonstração.',
       a.category, date_trunc('hour', now()) + a.starts, date_trunc('hour', now()) + a.starts + a.duration,
       a.lat, a.lng, a.label, a.capacity, a.cost, a.cost is not null, true
from (values
  ('00000000-0000-4000-8000-0000000000a1'::uuid, '00000000-0000-4000-8000-0000000000c1'::uuid,
   'Dia de trabalho conjunto (Demo)', 'work_together', interval '3 hours', interval '6 hours',
   -27.5960, -48.5505, 'Cowork Demo Centro', 6, null::int),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, null::uuid,
   'Pôr do sol na Lagoa (Demo)', 'meetup', interval '8 hours', interval '2 hours',
   -27.6010, -48.4745, 'Lagoa da Conceição, ponte', 12, null),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, null::uuid,
   'Trilha da Lagoinha do Leste (Demo)', 'outdoor', interval '1 day 2 hours', interval '5 hours',
   -27.7710, -48.4880, 'Pântano do Sul, início da trilha', 8, null),
  ('00000000-0000-4000-8000-0000000000a1'::uuid, null::uuid,
   'Almoço no Mercado Público (Demo)', 'food', interval '1 day 5 hours', interval '2 hours',
   -27.5975, -48.5520, 'Mercado Público, Centro', 6, 24000),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, '00000000-0000-4000-8000-0000000000c3'::uuid,
   'Coworking + praia no Campeche (Demo)', 'work_together', interval '2 days 3 hours', interval '7 hours',
   -27.6770, -48.4855, 'Cowork Demo Campeche', 5, null),
  ('00000000-0000-4000-8000-0000000000a3'::uuid, null::uuid,
   'Passeio de barco em Jurerê (Demo)', 'tour', interval '3 days 4 hours', interval '3 hours',
   -27.4395, -48.4960, 'Praia de Jurerê, trapiche', 10, 60000),
  ('00000000-0000-4000-8000-0000000000a1'::uuid, null::uuid,
   'Ostras em Santo Antônio de Lisboa (Demo)', 'food', interval '4 days 6 hours', interval '2 hours',
   -27.5075, -48.5195, 'Santo Antônio de Lisboa, praça', 8, 32000),
  ('00000000-0000-4000-8000-0000000000a2'::uuid, null::uuid,
   'Visita ao Centro Histórico (Demo)', 'culture', interval '6 days 2 hours', interval '3 hours',
   -27.5969, -48.5495, 'Praça XV de Novembro', 15, null)
) as a(creator, place, title, category, starts, duration, lat, lng, label, capacity, cost);
