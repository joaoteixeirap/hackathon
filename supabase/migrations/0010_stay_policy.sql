-- SPEC_V2 R5: the partner declares the stay policy of their place (the rule belongs to the
-- venue, so it wins over check-in reports). 'unknown' withdraws the declaration.

create function set_stay_policy(p_place_id uuid, p_policy text, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not owns_place(p_place_id) and not is_admin() then
    raise exception 'not your place' using errcode = '42501';
  end if;
  if p_policy not in ('free','min_consumption','time_limit','pass_required','unknown') then
    raise exception 'invalid policy';
  end if;
  if p_note is not null and char_length(p_note) > 140 then raise exception 'note too long'; end if;

  if p_policy = 'unknown' then
    update places set stay_policy = 'unknown', stay_note = null, facts_meta = facts_meta - 'stay_policy'
    where id = p_place_id;
  else
    update places set
      stay_policy = p_policy,
      stay_note = nullif(btrim(p_note), ''),
      facts_meta = facts_meta || jsonb_build_object('stay_policy',
        jsonb_build_object('source', 'partner', 'observed_at', now(), 'confirmations_90d', 0, 'outdated_30d', 0))
    where id = p_place_id;
  end if;
  perform recompute_place(p_place_id);
  return place_trust(p_place_id);
end;
$$;

revoke execute on function set_stay_policy(uuid, text, text) from public, anon;
grant execute on function set_stay_policy(uuid, text, text) to authenticated;
