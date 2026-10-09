-- V6: private budgets and expenses, public city aggregates and admin-only retention.
create table stay_budgets (
  stay_id uuid primary key references stays on delete cascade,
  monthly_budget_cents int not null check (monthly_budget_cents >= 0)
);
alter table stay_budgets enable row level security;
create policy budget_own on stay_budgets for all to authenticated
  using (exists (select 1 from stays s where s.id = stay_id and s.user_id = auth.uid()))
  with check (exists (select 1 from stays s where s.id = stay_id and s.user_id = auth.uid()));
create table stay_expenses (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references stays on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  category text not null check (category in ('housing','food','work','transport','health','leisure','other')),
  amount_cents int not null check (amount_cents > 0),
  spent_on date not null default current_date,
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now()
);
alter table stay_expenses enable row level security;
create policy expense_own on stay_expenses for all to authenticated
  using (user_id = auth.uid() and exists (select 1 from stays s where s.id = stay_id and s.user_id = auth.uid()))
  with check (user_id = auth.uid() and exists (select 1 from stays s where s.id = stay_id and s.user_id = auth.uid()));

create function city_presence_count(p_city_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select case when count(*) >= 3 then count(*)::int else null end
  from profiles where current_city_id = p_city_id and share_presence and stay_from <= local_today() and stay_to >= local_today();
$$;
revoke execute on function city_presence_count(uuid) from public;
grant execute on function city_presence_count(uuid) to anon, authenticated;

create function engagement_totals(p_since timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'approved', (select count(*) from activity_members where status = 'approved' and (p_since is null or created_at >= p_since)),
    'returning', (select count(*) from (select m.user_id from activity_members m join activities a on a.id = m.activity_id where m.status = 'approved' and a.ends_at <= now() and a.status <> 'cancelled' and (p_since is null or a.ends_at >= p_since) group by m.user_id having count(distinct m.activity_id) >= 2) x)
  );
end;
$$;
revoke execute on function engagement_totals(timestamptz) from public, anon;
grant execute on function engagement_totals(timestamptz) to authenticated;
-- Historical landing-page answers keep their original meaning; the admin panel labels them as legacy.
