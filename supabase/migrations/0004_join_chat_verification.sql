-- M5: join queue with reputation (F4/F7), manual verification (F7) and moderation helpers.

-- ---------------------------------------------------------------------------
-- People around an activity, with reputation.
-- Creator (and admin) see everyone who asked; approved members see the group;
-- anyone else sees nothing. Private profile columns are never returned.
-- ---------------------------------------------------------------------------

create function activity_people(p_activity_id uuid)
returns table (
  user_id uuid,
  display_name text,
  verified boolean,
  status text,           -- 'creator' | 'requested' | 'approved' | 'declined' | 'left'
  requested_at timestamptz,
  avg_rating numeric,
  review_count int
)
language sql stable security definer set search_path = public as $$
  with people as (
    select a.creator_id as user_id, 'creator'::text as status, a.created_at as requested_at
    from activities a where a.id = p_activity_id
    union all
    select m.user_id, m.status, m.created_at
    from activity_members m where m.activity_id = p_activity_id
  )
  select p.user_id, pr.display_name, pr.verified, p.status, p.requested_at, r.avg_rating, r.review_count
  from people p
  join profiles pr on pr.id = p.user_id
  cross join lateral profile_rating(p.user_id) r
  where is_admin()
     or (is_activity_creator(p_activity_id) and p.status in ('creator','requested','approved'))
     or (is_activity_participant(p_activity_id) and p.status in ('creator','approved'))
  order by case p.status when 'creator' then 0 when 'approved' then 1 else 2 end, p.requested_at;
$$;

revoke execute on function activity_people(uuid) from public, anon;
grant execute on function activity_people(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Manual verification: selfie with ID in a private bucket, read only by admins,
-- deleted after the decision (SPEC F7, CLAUDE.md rule 3).
-- ---------------------------------------------------------------------------

create table verification_requests (
  user_id uuid primary key references profiles on delete cascade,
  file_path text not null,
  created_at timestamptz not null default now()
);
alter table verification_requests enable row level security;

create policy verif_req_read on verification_requests for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy verif_req_insert on verification_requests for insert to authenticated
  with check (user_id = auth.uid() and file_path like auth.uid()::text || '/%');
create policy verif_req_update on verification_requests for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and file_path like auth.uid()::text || '/%');
create policy verif_req_delete on verification_requests for delete to authenticated using (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verifications', 'verifications', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

-- Users upload only into their own folder and cannot read files back; admins read and delete.
create policy verifications_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verifications_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'verifications' and is_admin());
create policy verifications_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verifications' and is_admin());

-- Admin decision: sets `verified` and drops the request. Returns the file path so the
-- caller deletes the object through the Storage API (direct SQL deletes are blocked).
create function decide_verification(p_user_id uuid, p_approve boolean) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_path text;
begin
  if not is_admin() then raise exception 'only admins can decide' using errcode = '42501'; end if;
  delete from verification_requests where user_id = p_user_id returning file_path into v_path;
  if v_path is null then raise exception 'no pending verification' using errcode = 'P0002'; end if;
  update profiles set verified = p_approve where id = p_user_id;
  return v_path;
end;
$$;

revoke execute on function decide_verification(uuid, boolean) from public, anon;
grant execute on function decide_verification(uuid, boolean) to authenticated;
