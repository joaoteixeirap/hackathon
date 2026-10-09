-- SPEC_V2 V3: routine profile (S1), stays (E1), stay checklist (E2), favorites (E3),
-- micro-survey (M1). Stays, tasks and favorites are private to their owner (I5e).

-- ---------------------------------------------------------------------------
-- S1: routine and interests. Not in the public column grant of profiles: other people
-- only ever see them through RPCs that check `discoverable` (V4).
-- ---------------------------------------------------------------------------

alter table profiles
  add column work_rhythm text not null default 'flexible' check (work_rhythm in ('morning','afternoon','evening','flexible')),
  add column work_style text not null default 'mixed' check (work_style in ('focus','calls','mixed')),
  add column interests text[] not null default '{}' check (cardinality(interests) <= 6),
  add column social_goals text[] not null default '{}' check (cardinality(social_goals) <= 4),
  add column discoverable boolean not null default false,
  add column timezone text not null default 'America/Sao_Paulo';

-- ---------------------------------------------------------------------------
-- E1: stays (one active per user)
-- ---------------------------------------------------------------------------

create table stays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  city_id uuid not null references cities,
  arrive_on date not null,
  leave_on date not null,
  audience text not null default 'br' check (audience in ('br','foreign')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (leave_on >= arrive_on and leave_on - arrive_on <= 366)
);
create unique index one_active_stay_per_user on stays (user_id) where active;
alter table stays enable row level security;
create policy stays_own on stays for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- E2: checklist templates (public) and the stay's tasks (private)
-- ---------------------------------------------------------------------------

create table stay_task_templates (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references cities,                    -- null = every city
  audience text not null default 'all' check (audience in ('all','br','foreign')),
  phase text not null check (phase in ('before','first_week','first_month','ongoing','before_leaving')),
  area text not null check (area in ('connectivity','health','housing','work','money','paperwork','social','transport')),
  title text not null,
  hint text,
  map_category text check (map_category in ('work','eat','health','stay','tour','service')),
  map_subcategory text,
  source_url text,
  source_checked_on date,
  sort int not null default 0,
  active boolean not null default true
);
alter table stay_task_templates enable row level security;
create policy task_templates_read on stay_task_templates for select using (true);
create policy task_templates_admin on stay_task_templates for all to authenticated using (is_admin()) with check (is_admin());

create table stay_tasks (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references stays on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  template_id uuid references stay_task_templates on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  area text not null default 'work',
  phase text not null default 'ongoing',
  due_on date,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index on stay_tasks (stay_id, phase);
alter table stay_tasks enable row level security;
create policy stay_tasks_own on stay_tasks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from stays s where s.id = stay_id and s.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- E3: favorites (private)
-- ---------------------------------------------------------------------------

create table place_favorites (
  user_id uuid references profiles on delete cascade,
  place_id uuid references places on delete cascade,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table place_favorites enable row level security;
create policy favorites_own on place_favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- M1: micro-survey answers (anonymous allowed; only admins read)
-- ---------------------------------------------------------------------------

create table micro_answers (
  id uuid primary key default gen_random_uuid(),
  question_key text not null check (char_length(question_key) <= 32),
  answer_key text not null check (char_length(answer_key) <= 32),
  user_id uuid references profiles on delete set null,
  session_id text check (char_length(session_id) <= 64),
  city_slug text check (char_length(city_slug) <= 60),
  origin text check (origin in ('espera','estadia')),
  created_at timestamptz not null default now()
);
create unique index micro_answers_one_per_session on micro_answers (question_key, session_id) where session_id is not null;
alter table micro_answers enable row level security;
create policy micro_answers_insert on micro_answers for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
create policy micro_answers_admin on micro_answers for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- set_stay: creates or updates the active stay, keeps profiles' stay fields (used by
-- presence) in sync and instantiates the checklist for the stay's city and audience.
-- ---------------------------------------------------------------------------

create function set_stay(p_city_id uuid, p_arrive date, p_leave date, p_audience text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_stay uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_audience not in ('br','foreign') then raise exception 'invalid audience'; end if;
  if p_leave < p_arrive or p_leave - p_arrive > 366 then raise exception 'invalid dates'; end if;
  if not exists (select 1 from cities where id = p_city_id) then raise exception 'city not found'; end if;

  select id into v_stay from stays where user_id = v_uid and active;
  if v_stay is null then
    insert into stays (user_id, city_id, arrive_on, leave_on, audience)
    values (v_uid, p_city_id, p_arrive, p_leave, p_audience) returning id into v_stay;
  else
    update stays set city_id = p_city_id, arrive_on = p_arrive, leave_on = p_leave, audience = p_audience where id = v_stay;
  end if;

  update profiles set current_city_id = p_city_id, stay_from = p_arrive, stay_to = p_leave where id = v_uid;

  insert into stay_tasks (stay_id, user_id, template_id, title, area, phase)
  select v_stay, v_uid, t.id, t.title, t.area, t.phase
  from stay_task_templates t
  where t.active
    and t.audience in ('all', p_audience)
    and (t.city_id is null or t.city_id = p_city_id)
    and not exists (select 1 from stay_tasks st where st.stay_id = v_stay and st.template_id = t.id);

  return v_stay;
end;
$$;

create function end_stay() returns void
language plpgsql security definer set search_path = public as $$
begin
  update stays set active = false where user_id = auth.uid() and active;
  update profiles set stay_from = null, stay_to = null, share_presence = false where id = auth.uid();
end;
$$;

revoke execute on function set_stay(uuid, date, date, text), end_stay() from public, anon;
grant execute on function set_stay(uuid, date, date, text), end_stay() to authenticated;

-- ---------------------------------------------------------------------------
-- E2 seed: checklist templates (titles only; no legal deadlines or amounts).
-- ---------------------------------------------------------------------------

insert into stay_task_templates (audience, phase, area, title, hint, map_category, source_url, source_checked_on, sort) values
  ('all', 'before', 'money', 'Definir o orçamento mensal da estadia', null, null, null, '2026-10-09', 10),
  ('all', 'before', 'work', 'Escolher o bairro olhando os locais de trabalho no Radar', null, 'work', null, '2026-10-09', 20),
  ('all', 'before', 'housing', 'Combinar com o anfitrião a velocidade do Wi-Fi e as regras da casa antes de fechar', null, null, null, '2026-10-09', 30),
  ('all', 'before', 'connectivity', 'Conferir a cobertura da sua operadora no bairro', null, null, null, '2026-10-09', 40),
  ('all', 'first_week', 'connectivity', 'Fazer um teste de velocidade na hospedagem', null, null, null, '2026-10-09', 10),
  ('all', 'first_week', 'work', 'Escolher 2 locais de trabalho reserva no Radar', null, 'work', null, '2026-10-09', 20),
  ('all', 'first_week', 'health', 'Localizar farmácia e pronto atendimento mais próximos', null, 'health', null, '2026-10-09', 30),
  ('all', 'first_week', 'social', 'Ativar "quem está aqui" se quiser conhecer gente', 'Decisão sua: aparece só como número no bairro, a partir de 3 pessoas.', null, null, '2026-10-09', 40),
  ('all', 'first_week', 'social', 'Ir ao encontro de boas-vindas', null, null, null, '2026-10-09', 50),
  ('all', 'first_month', 'social', 'Entrar numa atividade recorrente', null, null, null, '2026-10-09', 10),
  ('all', 'first_month', 'money', 'Revisar os gastos das primeiras semanas', null, null, null, '2026-10-09', 20),
  ('all', 'first_month', 'housing', 'Achar mercado e lavanderia de referência', null, 'service', null, '2026-10-09', 30),
  ('all', 'ongoing', 'work', 'Registrar um local de trabalho que você testou (ajuda o Radar)', null, 'work', null, '2026-10-09', 10),
  ('all', 'before_leaving', 'social', 'Avaliar locais e atividades', null, null, null, '2026-10-09', 10),
  ('all', 'before_leaving', 'housing', 'Fechar pendências da hospedagem (caução, contas)', null, null, null, '2026-10-09', 20),
  ('all', 'before_leaving', 'social', 'Avisar o grupo da sua saída', null, null, null, '2026-10-09', 30),
  ('foreign', 'before', 'paperwork', 'Confirmar o seguro-saúde exigido pelo seu visto e guardar a apólice',
   'Lembrete, não é aconselhamento jurídico.', null,
   'https://www.mobiletime.com.br/noticias/24/01/2022/governo-federal-regulamenta-visto-para-nomade-digital/', '2026-10-09', 50),
  ('foreign', 'before', 'paperwork', 'Conferir a validade do visto e as regras de prorrogação em fonte oficial (gov.br)',
   'Lembrete, não é aconselhamento jurídico.', null, null, '2026-10-09', 60),
  ('foreign', 'before', 'paperwork', 'Verificar se vai precisar de CPF para aluguel, chip e conta bancária',
   'Lembrete, não é aconselhamento jurídico.', null, null, '2026-10-09', 70),
  ('foreign', 'first_week', 'money', 'Escolher conta ou cartão para pagar no Brasil', null, null, null, '2026-10-09', 60);
