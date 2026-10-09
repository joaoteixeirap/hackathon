-- Topic spaces are empty until real people opt in. No fabricated members or messages.
create table city_communities (
 id uuid primary key default gen_random_uuid(), city_id uuid not null references cities,
 topic text not null check(topic in ('remote_work','arrival','housing','families','outdoor','culture')),
 active boolean not null default true, created_at timestamptz not null default now(), unique(city_id,topic)
);
create table community_members (
 community_id uuid references city_communities on delete cascade,
 user_id uuid references profiles on delete cascade,
 muted boolean not null default false, last_read_at timestamptz not null default now(), joined_at timestamptz not null default now(),
 primary key(community_id,user_id)
);
create table community_messages (
 id uuid primary key default gen_random_uuid(),community_id uuid not null references city_communities on delete cascade,
 user_id uuid not null references profiles on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 1000),created_at timestamptz not null default now()
);
create index community_messages_recent on community_messages(community_id,created_at desc,id);
alter table city_communities enable row level security;
alter table community_members enable row level security;
alter table community_messages enable row level security;
create policy communities_read on city_communities for select using(active or is_admin());
create policy communities_admin on city_communities for all to authenticated using(is_admin()) with check(is_admin());
create policy community_members_own_read on community_members for select to authenticated using(user_id=auth.uid());
create policy community_members_own_delete on community_members for delete to authenticated using(user_id=auth.uid());
create policy community_members_own_update on community_members for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on community_members from anon,authenticated;
grant select,delete on community_members to authenticated;
grant update(muted,last_read_at) on community_members to authenticated;

create function is_community_member(p_community uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from community_members m join profiles p on p.id=m.user_id join city_communities c on c.id=m.community_id where m.community_id=p_community and m.user_id=auth.uid() and p.verified and c.active);
$$;
revoke all on function is_community_member(uuid) from public,anon;
grant execute on function is_community_member(uuid) to authenticated;
create policy community_messages_read on community_messages for select to authenticated using(is_admin() or (is_community_member(community_id) and not is_blocked_between(auth.uid(),user_id)));
create policy community_messages_admin_delete on community_messages for delete to authenticated using(is_admin());
revoke all on community_messages from anon,authenticated;
grant select,delete on community_messages to authenticated;

create function join_city_communities(p_city_id uuid,p_ids uuid[],p_muted boolean default false) returns void
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null or not exists(select 1 from profiles where id=v_uid and verified) then raise exception 'verification required' using errcode='42501';end if;
 if p_ids is null or cardinality(p_ids)>6 or array_position(p_ids,null) is not null then raise exception 'invalid selection';end if;
 if exists(select 1 from unnest(p_ids) x where not exists(select 1 from city_communities c where c.id=x and c.city_id=p_city_id and c.active)) then raise exception 'community not found';end if;
 insert into community_members(community_id,user_id,muted) select distinct x,v_uid,coalesce(p_muted,false) from unnest(p_ids) x
 on conflict(community_id,user_id) do update set muted=excluded.muted;
end;$$;

-- Counts describe opted-in membership, never current location; no member list exposed.
create function city_community_counts(p_city_id uuid) returns table(id uuid,topic text,members bigint)
language sql stable security definer set search_path=public as $$
 select c.id,c.topic,count(p.id) from city_communities c left join community_members m on m.community_id=c.id left join profiles p on p.id=m.user_id and p.verified
 where c.city_id=p_city_id and c.active group by c.id,c.topic order by c.topic;
$$;
create function send_community_message(p_community_id uuid,p_body text) returns community_messages
language plpgsql security definer set search_path=public as $$
declare v_row community_messages;v_uid uuid:=auth.uid();
begin
 if not is_community_member(p_community_id) then raise exception 'membership required' using errcode='42501';end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'invalid message';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_uid::text,24));
 if (select count(*) from community_messages where user_id=v_uid and created_at>now()-interval '10 seconds')>=5 then raise exception 'send slower';end if;
 insert into community_messages(community_id,user_id,body) values(p_community_id,v_uid,btrim(p_body)) returning * into v_row;return v_row;
end;$$;
revoke all on function join_city_communities(uuid,uuid[],boolean),city_community_counts(uuid),send_community_message(uuid,text) from public,anon;
grant execute on function city_community_counts(uuid) to anon,authenticated;
grant execute on function join_city_communities(uuid,uuid[],boolean),send_community_message(uuid,text) to authenticated;

insert into city_communities(city_id,topic) select c.id,t.topic from cities c cross join (values('remote_work'),('arrival'),('housing'),('families'),('outdoor'),('culture')) t(topic);
-- Ensure new cities added by partners/admin get the same empty spaces.
create function create_city_communities() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into city_communities(city_id,topic) select new.id,t from unnest(array['remote_work','arrival','housing','families','outdoor','culture']) t;return new;end;$$;
create trigger city_communities_created after insert on cities for each row execute function create_city_communities();
alter publication supabase_realtime add table community_messages;
alter table reports drop constraint reports_target_type_check;
alter table reports add constraint reports_target_type_check check(target_type in ('activity','message','profile','place','community','community_message'));
