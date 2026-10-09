-- Private intentions. Saving a plan never writes profiles/presence/stays.
create table destination_plans (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references profiles on delete cascade,
 city_id uuid not null references cities,
 status text not null default 'considering' check(status in ('considering','planned','arrived')),
 date_mode text not null check(date_mode in ('exact','flexible','resident')),
 arrive_on date,
 leave_on date,
 duration_days int check(duration_days between 1 and 366),
 monthly_budget_cents bigint check(monthly_budget_cents between 0 and 100000000),
 needs_calls boolean not null default false,
 with_children boolean not null default false,
 with_pets boolean not null default false,
 note text check(char_length(note)<=500),
 stay_id uuid references stays on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(leave_on is null or (arrive_on is not null and leave_on>=arrive_on and leave_on-arrive_on<=366)),
 check(date_mode<>'exact' or (arrive_on is not null and leave_on is not null)),
 check(date_mode<>'resident' or leave_on is null)
);
create index destination_plans_owner on destination_plans(user_id,created_at);
alter table destination_plans enable row level security;
create policy plans_read on destination_plans for select to authenticated using(user_id=auth.uid());
create policy plans_insert on destination_plans for insert to authenticated with check(user_id=auth.uid() and status in ('considering','planned') and stay_id is null);
create policy plans_update on destination_plans for update to authenticated using(user_id=auth.uid() and status<>'arrived') with check(user_id=auth.uid() and status in ('considering','planned') and stay_id is null);
create policy plans_delete on destination_plans for delete to authenticated using(user_id=auth.uid());
revoke all on destination_plans from anon,authenticated;
grant select,delete on destination_plans to authenticated;
grant insert(user_id,city_id,status,date_mode,arrive_on,leave_on,duration_days,monthly_budget_cents,needs_calls,with_children,with_pets,note) on destination_plans to authenticated;
grant update(city_id,status,date_mode,arrive_on,leave_on,duration_days,monthly_budget_cents,needs_calls,with_children,with_pets,note) on destination_plans to authenticated;
create function plan_timestamp() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now();return new;end;$$;
create trigger plan_updated before update on destination_plans for each row execute function plan_timestamp();

-- Explicit arrival: transactional, serialized per owner, idempotent per plan.
-- Close the old stay and start a NEW one; old expenses and checklist remain attached to it.
create function arrive_destination(p_plan_id uuid,p_arrive date,p_leave date,p_audience text default 'br') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_plan destination_plans; v_stay uuid;
begin
 if v_uid is null then raise exception 'not authenticated' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,23));
 select * into v_plan from destination_plans where id=p_plan_id and user_id=v_uid for update;
 if not found then raise exception 'plan not found' using errcode='42501';end if;
 if v_plan.status='arrived' and v_plan.stay_id is not null then return v_plan.stay_id;end if;
 if p_arrive is null or p_leave is null or p_leave<p_arrive or p_leave-p_arrive>366 or p_arrive>(now() at time zone 'America/Sao_Paulo')::date or p_leave<(now() at time zone 'America/Sao_Paulo')::date then raise exception 'arrival must include today';end if;
 if p_audience is null or p_audience not in ('br','foreign') then raise exception 'invalid audience';end if;
 perform end_stay();
 update profiles set neighborhood=null,share_presence=false,discoverable=false where id=v_uid;
 v_stay:=set_stay(v_plan.city_id,p_arrive,p_leave,p_audience);
 update destination_plans set status='arrived',stay_id=v_stay where id=p_plan_id;
 if v_plan.monthly_budget_cents is not null then insert into stay_budgets(stay_id,monthly_budget_cents) values(v_stay,v_plan.monthly_budget_cents);end if;
 if v_plan.with_children then
  insert into stay_tasks(stay_id,user_id,title,area,phase) values(v_stay,v_uid,'Conferir escolas, vagas e calendário para os filhos','housing','first_week');
 end if;
 if v_plan.with_pets then
  insert into stay_tasks(stay_id,user_id,title,area,phase) values(v_stay,v_uid,'Confirmar regras para pets na moradia e no trabalho','housing','first_week');
 end if;
 return v_stay;
end;$$;
revoke all on function arrive_destination(uuid,date,date,text) from public,anon;
grant execute on function arrive_destination(uuid,date,date,text) to authenticated;
