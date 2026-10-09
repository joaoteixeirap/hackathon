-- Preserve the existing redemption response contract.
create or replace function redeem_offer(p_offer_id uuid, p_activity_id uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  day date := local_today();
  o offers;
  a activities;
  at timestamptz;
begin
  if uid is null or not is_verified() then raise exception 'verification pending' using errcode = '42501'; end if;
  select * into o from offers where id = p_offer_id for update;
  if not found or not o.active or o.valid_from > day or o.valid_to < day then raise exception 'offer not available'; end if;
  if o.min_group is not null then
    select * into a from activities where id = p_activity_id for update;
    if a.id is null or a.status not in ('open','full') or a.offer_id is distinct from o.id or a.place_id is distinct from o.place_id
       or not (a.creator_id = uid or exists (select 1 from activity_members where activity_id = a.id and user_id = uid and status = 'approved'))
    then raise exception 'group membership required' using errcode = '42501'; end if;
    if approved_count(a.id) + 1 < o.min_group then raise exception 'group too small'; end if;
    if now() < a.starts_at - make_interval(mins => group_early_minutes()) or now() > a.ends_at then raise exception 'outside group window'; end if;
  elsif p_activity_id is not null then
    raise exception 'not a group offer';
  end if;
  select created_at into at from offer_redemptions where offer_id = o.id and user_id = uid and redeemed_on = day;
  if found then
    if at > now() - offer_window() then return jsonb_build_object('code', o.code, 'redeemed_at', at, 'expires_at', at + offer_window()); end if;
    raise exception 'already redeemed today';
  end if;
  if o.capacity is not null and (select count(*) from offer_redemptions where offer_id = o.id) >= o.capacity then raise exception 'offer sold out'; end if;
  insert into offer_redemptions (offer_id, user_id, redeemed_on, activity_id) values (o.id, uid, day, p_activity_id) returning created_at into at;
  return jsonb_build_object('code', o.code, 'redeemed_at', at, 'expires_at', at + offer_window());
end;
$$;
