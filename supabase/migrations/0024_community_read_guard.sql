-- The existing block-pair helper is intentionally not executable by clients.
-- Policy wrapper fixes permission errors without exposing arbitrary users' block relationships.
create function can_read_community_message(p_community uuid,p_author uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select is_community_member(p_community) and not is_blocked_between(auth.uid(),p_author);
$$;
revoke all on function can_read_community_message(uuid,uuid) from public,anon;
grant execute on function can_read_community_message(uuid,uuid) to authenticated;
drop policy community_messages_read on community_messages;
create policy community_messages_read on community_messages for select to authenticated using(is_admin() or can_read_community_message(community_id,user_id));
