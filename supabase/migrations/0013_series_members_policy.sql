-- The series_members read policy queried series_members itself (infinite recursion in RLS).
-- Same pattern as activity_members: a security definer helper.

create function is_series_member(p_series_id uuid, p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from series_members where series_id = p_series_id and user_id = p_user_id and status = 'approved');
$$;

create function is_series_creator(p_series_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from activity_series where id = p_series_id and creator_id = auth.uid());
$$;

drop policy series_members_read on series_members;
create policy series_members_read on series_members for select to authenticated
  using (
    user_id = auth.uid()
    or is_series_creator(series_id)
    or (status = 'approved' and is_series_member(series_id))
    or is_admin()
  );
