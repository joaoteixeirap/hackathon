-- M6: partner panel, offers, redemption with code + QR, simulated featuring (SPEC F10, F11).

-- ---------------------------------------------------------------------------
-- Hackathon mode: partners are approved on sign-up so the demo runs without the admin.
-- Flip to true to send new partners to /admin/parceiros again.
-- ---------------------------------------------------------------------------

create function require_partner_approval() returns boolean
language sql immutable as $$ select false $$;

create or replace function protect_partner_columns() returns trigger
language plpgsql as $$
begin
  if is_end_user_call() and not is_admin() then
    if tg_op = 'INSERT' then
      new.approved := not require_partner_approval();
      new.plan := 'free';
    elsif new.approved is distinct from old.approved
       or new.plan is distinct from old.plan
       or new.owner_id is distinct from old.owner_id then
      raise exception 'only admins can change approval, plan or owner' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- One business per owner keeps the panel simple.
create unique index partners_one_per_owner on partners (owner_id);

-- ---------------------------------------------------------------------------
-- Offer codes are shown only on redemption (or to the owner): hide the column.
-- ---------------------------------------------------------------------------

revoke select on offers from anon, authenticated;
grant select (id, place_id, kind, title, description, valid_from, valid_to, capacity, active, created_at)
  on offers to anon, authenticated;

create function offer_window() returns interval language sql immutable as $$ select interval '10 minutes' $$;

-- Local day for "one redemption per day" (pilot cities are in Brasília time).
create function local_today() returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Redeem (F11): verified user, active and valid offer, capacity left, once per day.
-- Calling again inside the 10-minute window returns the same code.
create function redeem_offer(p_offer_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := local_today();
  v_offer offers;
  v_at timestamptz;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if not is_verified() then raise exception 'verification pending' using errcode = '42501'; end if;

  select * into v_offer from offers where id = p_offer_id for update;
  if not found or not v_offer.active
     or (v_offer.valid_from is not null and v_offer.valid_from > v_today)
     or (v_offer.valid_to is not null and v_offer.valid_to < v_today) then
    raise exception 'offer not available' using errcode = 'P0002';
  end if;

  select created_at into v_at from offer_redemptions
  where offer_id = p_offer_id and user_id = v_uid and redeemed_on = v_today;
  if found then
    if v_at > now() - offer_window() then
      return jsonb_build_object('code', v_offer.code, 'redeemed_at', v_at, 'expires_at', v_at + offer_window());
    end if;
    raise exception 'already redeemed today' using errcode = 'P0001';
  end if;

  if v_offer.capacity is not null
     and (select count(*) from offer_redemptions where offer_id = p_offer_id) >= v_offer.capacity then
    raise exception 'offer sold out' using errcode = 'P0001';
  end if;

  insert into offer_redemptions (offer_id, user_id, redeemed_on)
  values (p_offer_id, v_uid, v_today)
  returning created_at into v_at;
  return jsonb_build_object('code', v_offer.code, 'redeemed_at', v_at, 'expires_at', v_at + offer_window());
end;
$$;

-- Redemptions go through redeem_offer only.
drop policy redemptions_insert on offer_redemptions;

-- ---------------------------------------------------------------------------
-- Partner panel RPCs (owner or admin only)
-- ---------------------------------------------------------------------------

create function partner_offers(p_place_id uuid)
returns table (
  id uuid, kind text, title text, description text, code text, valid_from date, valid_to date,
  capacity int, active boolean, created_at timestamptz, redemptions int, redemptions_today int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (owns_place(p_place_id) or is_admin()) then raise exception 'not your place' using errcode = '42501'; end if;
  return query
    select o.id, o.kind, o.title, o.description, o.code, o.valid_from, o.valid_to, o.capacity, o.active, o.created_at,
           (select count(*)::int from offer_redemptions r where r.offer_id = o.id),
           (select count(*)::int from offer_redemptions r where r.offer_id = o.id and r.redeemed_on = local_today())
    from offers o where o.place_id = p_place_id
    order by o.active desc, o.created_at desc;
end;
$$;

-- Who redeemed: date and first name only (SPEC F10).
create function partner_redemptions(p_place_id uuid)
returns table (offer_id uuid, offer_title text, first_name text, redeemed_on date, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (owns_place(p_place_id) or is_admin()) then raise exception 'not your place' using errcode = '42501'; end if;
  return query
    select r.offer_id, o.title, split_part(p.display_name, ' ', 1), r.redeemed_on, r.created_at
    from offer_redemptions r
    join offers o on o.id = r.offer_id
    join profiles p on p.id = r.user_id
    where o.place_id = p_place_id
    order by r.created_at desc
    limit 200;
end;
$$;

-- Claim an imported (OSM) place that nobody manages yet.
create function claim_place(p_place_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_partner uuid;
begin
  select id into v_partner from partners where owner_id = auth.uid() and approved;
  if v_partner is null then raise exception 'no approved partner' using errcode = '42501'; end if;
  update places set partner_id = v_partner where id = p_place_id and partner_id is null and not is_demo;
  if not found then raise exception 'place already claimed' using errcode = 'P0001'; end if;
end;
$$;

-- "Destacar no mapa" (simulated payment): 30 days of bigger pin and top of the list.
create function feature_place(p_place_id uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_until timestamptz := now() + interval '30 days';
begin
  if not owns_place(p_place_id) then raise exception 'not your place' using errcode = '42501'; end if;
  update places set featured_until = v_until where id = p_place_id;
  update partners set plan = 'destaque' where id = (select partner_id from places where id = p_place_id);
  return v_until;
end;
$$;

revoke execute on function redeem_offer(uuid), partner_offers(uuid), partner_redemptions(uuid), claim_place(uuid), feature_place(uuid)
  from public, anon;
grant execute on function redeem_offer(uuid), partner_offers(uuid), partner_redemptions(uuid), claim_place(uuid), feature_place(uuid)
  to authenticated;
