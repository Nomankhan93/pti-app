-- PTI Digital Operations Platform — Phase 6
-- Leadership Monitoring: hierarchical KPI dashboards, drill-down analytics and reporting.
-- Depends on Phase 1–5 migrations, including canonical organization hierarchy and finance ledger.

begin;

-- -----------------------------------------------------------------------------
-- Canonical membership scope linkage
-- -----------------------------------------------------------------------------
-- Membership originally stored district / taluka as display text. Phase 6 adds
-- canonical geography + organization references so leadership rollups are exact.

alter table public.members
  add column if not exists geography_id uuid references public.geographies(id) on delete restrict,
  add column if not exists org_unit_id uuid references public.organization_units(id) on delete restrict;

-- The old BBJF/JAS-era Sindh-only district CHECK is no longer valid now that
-- registration uses the Pakistan-wide geography reference table.
alter table public.members
  drop constraint if exists members_district_check;

create index if not exists members_geography_id_idx on public.members(geography_id);
create index if not exists members_org_unit_id_idx on public.members(org_unit_id, is_active, issued_at desc);

-- Backfill legacy rows only when district + tehsil/taluka resolve to exactly one
-- canonical tehsil. Ambiguous/unmapped legacy rows remain nullable and are exposed
-- separately in the Central dashboard instead of being guessed.
with candidates as (
  select
    m.id as member_id,
    array_agg(t.id order by t.code) as geography_ids,
    array_agg(ou.id order by t.code) as org_unit_ids,
    count(*) as candidate_count
  from public.members m
  join public.geographies t
    on t.kind = 'tehsil'::public.geography_kind
   and t.is_active
   and lower(trim(t.name)) = lower(trim(coalesce(m.taluka, '')))
  join public.geographies d
    on d.id = t.parent_id
   and d.kind = 'district'::public.geography_kind
   and d.is_active
   and lower(trim(d.name)) = lower(trim(m.district))
  join public.organization_units ou
    on ou.geography_id = t.id
   and ou.level = 'tehsil'::public.organization_level
   and ou.is_active
  where m.geography_id is null
    and nullif(trim(coalesce(m.taluka, '')), '') is not null
  group by m.id
  having count(*) = 1
)
update public.members m
set geography_id = (c.geography_ids)[1],
    org_unit_id = (c.org_unit_ids)[1]
from candidates c
where m.id = c.member_id;

create or replace function app_private.sync_member_org_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_org_unit uuid;
  resolved_district text;
  resolved_tehsil text;
begin
  if new.geography_id is null then
    new.org_unit_id := null;
    return new;
  end if;

  select ou.id, district.name, tehsil.name
    into resolved_org_unit, resolved_district, resolved_tehsil
  from public.geographies tehsil
  join public.geographies district on district.id = tehsil.parent_id
  join public.organization_units ou on ou.geography_id = tehsil.id
  where tehsil.id = new.geography_id
    and tehsil.kind = 'tehsil'::public.geography_kind
    and tehsil.is_active
    and district.kind = 'district'::public.geography_kind
    and district.is_active
    and ou.level = 'tehsil'::public.organization_level
    and ou.is_active;

  if resolved_org_unit is null then
    raise exception 'Membership geography must resolve to an active tehsil organization unit';
  end if;

  new.org_unit_id := resolved_org_unit;
  -- Keep legacy display fields canonical for cards / verification compatibility.
  new.district := resolved_district;
  new.taluka := resolved_tehsil;
  return new;
end;
$$;

revoke all on function app_private.sync_member_org_scope() from public, anon, authenticated;

drop trigger if exists members_sync_org_scope on public.members;
create trigger members_sync_org_scope
before insert or update of geography_id, org_unit_id, district, taluka on public.members
for each row execute function app_private.sync_member_org_scope();

-- -----------------------------------------------------------------------------
-- Organization closure table for fast hierarchical analytics
-- -----------------------------------------------------------------------------

create table if not exists public.organization_unit_closure (
  ancestor_id uuid not null references public.organization_units(id) on delete cascade,
  descendant_id uuid not null references public.organization_units(id) on delete cascade,
  depth integer not null,
  primary key (ancestor_id, descendant_id),
  constraint organization_unit_closure_depth_check check (depth >= 0)
);

create index if not exists organization_unit_closure_descendant_idx
  on public.organization_unit_closure(descendant_id, ancestor_id);

alter table public.organization_unit_closure enable row level security;
revoke all on public.organization_unit_closure from anon, authenticated;

create or replace function app_private.rebuild_organization_unit_closure()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.organization_unit_closure;

  with recursive closure as (
    select ou.id as ancestor_id, ou.id as descendant_id, 0 as depth
    from public.organization_units ou

    union all

    select c.ancestor_id, child.id, c.depth + 1
    from closure c
    join public.organization_units child on child.parent_id = c.descendant_id
  )
  insert into public.organization_unit_closure(ancestor_id, descendant_id, depth)
  select ancestor_id, descendant_id, depth
  from closure;
end;
$$;

revoke all on function app_private.rebuild_organization_unit_closure() from public, anon, authenticated;
select app_private.rebuild_organization_unit_closure();

create or replace function app_private.organization_units_refresh_closure_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.rebuild_organization_unit_closure();
  return null;
end;
$$;

revoke all on function app_private.organization_units_refresh_closure_trigger() from public, anon, authenticated;

drop trigger if exists organization_units_refresh_closure on public.organization_units;
create trigger organization_units_refresh_closure
after insert or delete or update of parent_id on public.organization_units
for each statement execute function app_private.organization_units_refresh_closure_trigger();

-- -----------------------------------------------------------------------------
-- Leadership authorization
-- -----------------------------------------------------------------------------

create or replace function app_private.can_view_leadership(
  p_user_id uuid,
  p_target_org_unit uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and p_target_org_unit is not null
    and (
      app_private.is_legacy_admin(p_user_id)
      or exists (
        select 1
        from public.organization_role_assignments ra
        join public.organization_unit_closure c
          on c.ancestor_id = ra.org_unit_id
         and c.descendant_id = p_target_org_unit
        where ra.user_id = p_user_id
          and ra.is_active
          and ra.role in (
            'super_admin'::public.organization_role,
            'central_leadership'::public.organization_role,
            'national_operations_admin'::public.organization_role,
            'national_finance_admin'::public.organization_role,
            'provincial_coordinator'::public.organization_role,
            'divisional_coordinator'::public.organization_role,
            'district_coordinator'::public.organization_role,
            'tehsil_coordinator'::public.organization_role,
            'auditor'::public.organization_role
          )
      )
    );
$$;

revoke all on function app_private.can_view_leadership(uuid,uuid) from public, anon, authenticated;
grant execute on function app_private.can_view_leadership(uuid,uuid) to authenticated;

create or replace function app_private.my_leadership_access_impl()
returns table(
  can_view boolean,
  default_org_unit_id uuid,
  default_org_unit_name text,
  default_org_unit_level public.organization_level
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  central_id uuid;
begin
  if actor is null then
    return query select false, null::uuid, null::text, null::public.organization_level;
    return;
  end if;

  if app_private.is_legacy_admin(actor) then
    select ou.id into central_id
    from public.organization_units ou
    where ou.level = 'central'::public.organization_level
      and ou.is_active
    order by ou.created_at
    limit 1;

    return query
    select true, ou.id, ou.name, ou.level
    from public.organization_units ou
    where ou.id = central_id;
    return;
  end if;

  return query
  select true, ou.id, ou.name, ou.level
  from public.organization_role_assignments ra
  join public.organization_units ou on ou.id = ra.org_unit_id
  where ra.user_id = actor
    and ra.is_active
    and ou.is_active
    and ra.role in (
      'super_admin'::public.organization_role,
      'central_leadership'::public.organization_role,
      'national_operations_admin'::public.organization_role,
      'national_finance_admin'::public.organization_role,
      'provincial_coordinator'::public.organization_role,
      'divisional_coordinator'::public.organization_role,
      'district_coordinator'::public.organization_role,
      'tehsil_coordinator'::public.organization_role,
      'auditor'::public.organization_role
    )
  order by
    case ou.level
      when 'central'::public.organization_level then 0
      when 'province'::public.organization_level then 1
      when 'division'::public.organization_level then 2
      when 'district'::public.organization_level then 3
      when 'tehsil'::public.organization_level then 4
      else 9
    end,
    ra.assigned_at
  limit 1;

  if not found then
    return query select false, null::uuid, null::text, null::public.organization_level;
  end if;
end;
$$;

revoke all on function app_private.my_leadership_access_impl() from public, anon, authenticated;
grant execute on function app_private.my_leadership_access_impl() to authenticated;

create or replace function app_private.list_leadership_scopes_impl()
returns table(
  id uuid,
  parent_id uuid,
  level public.organization_level,
  name text,
  code text,
  depth integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    return;
  end if;

  if app_private.is_legacy_admin(actor) then
    return query
    select ou.id, ou.parent_id, ou.level, ou.name, ou.code, c.depth
    from public.organization_units root
    join public.organization_unit_closure c on c.ancestor_id = root.id
    join public.organization_units ou on ou.id = c.descendant_id
    where root.level = 'central'::public.organization_level
      and root.is_active
      and ou.is_active
    order by c.depth, ou.name;
    return;
  end if;

  return query
  with roots as (
    select distinct ra.org_unit_id
    from public.organization_role_assignments ra
    where ra.user_id = actor
      and ra.is_active
      and ra.role in (
        'super_admin'::public.organization_role,
        'central_leadership'::public.organization_role,
        'national_operations_admin'::public.organization_role,
        'national_finance_admin'::public.organization_role,
        'provincial_coordinator'::public.organization_role,
        'divisional_coordinator'::public.organization_role,
        'district_coordinator'::public.organization_role,
        'tehsil_coordinator'::public.organization_role,
        'auditor'::public.organization_role
      )
  )
  select distinct on (ou.id)
    ou.id,
    ou.parent_id,
    ou.level,
    ou.name,
    ou.code,
    c.depth
  from roots r
  join public.organization_unit_closure c on c.ancestor_id = r.org_unit_id
  join public.organization_units ou on ou.id = c.descendant_id
  where ou.is_active
  order by ou.id, c.depth;
end;
$$;

revoke all on function app_private.list_leadership_scopes_impl() from public, anon, authenticated;
grant execute on function app_private.list_leadership_scopes_impl() to authenticated;

-- -----------------------------------------------------------------------------
-- Dashboard analytics implementation
-- -----------------------------------------------------------------------------

create or replace function app_private.get_leadership_dashboard_impl(
  p_org_unit_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  from_ts timestamptz := coalesce(p_from, now() - interval '30 days');
  to_ts timestamptz := coalesce(p_to, now());
  bucket_unit text;
  result jsonb;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  if p_org_unit_id is null or not app_private.can_view_leadership(actor, p_org_unit_id) then
    raise exception 'Leadership dashboard access denied for this organization scope';
  end if;

  if to_ts <= from_ts then
    raise exception 'Reporting end must be after reporting start';
  end if;

  if to_ts - from_ts <= interval '31 days' then
    bucket_unit := 'day';
  elsif to_ts - from_ts <= interval '180 days' then
    bucket_unit := 'week';
  else
    bucket_unit := 'month';
  end if;

  with
  scope_units as (
    select c.descendant_id as id
    from public.organization_unit_closure c
    where c.ancestor_id = p_org_unit_id
  ),
  current_unit as (
    select ou.id, ou.parent_id, ou.level, ou.name, ou.code
    from public.organization_units ou
    where ou.id = p_org_unit_id
  ),
  path_rows as (
    select c.ancestor_id as id, c.depth
    from public.organization_unit_closure c
    where c.descendant_id = p_org_unit_id
  ),
  path_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ou.id,
          'name', ou.name,
          'level', ou.level,
          'code', ou.code
        ) order by pr.depth desc
      ),
      '[]'::jsonb
    ) as value
    from path_rows pr
    join public.organization_units ou on ou.id = pr.id
  ),
  membership_kpi as (
    select
      count(*) filter (where m.is_active)::bigint as active_total,
      count(*) filter (where m.is_active and m.issued_at >= from_ts and m.issued_at < to_ts)::bigint as new_period
    from public.members m
    join scope_units s on s.id = m.org_unit_id
  ),
  unmapped_members as (
    select case
      when exists (
        select 1 from current_unit cu where cu.level = 'central'::public.organization_level
      ) then (
        select count(*)::bigint from public.members m where m.is_active and m.org_unit_id is null
      )
      else 0::bigint
    end as total
  ),
  volunteer_kpi as (
    select
      count(*) filter (where vp.is_active)::bigint as active_total,
      count(*) filter (where vp.is_active and vp.availability = 'available'::public.volunteer_availability)::bigint as available_total,
      count(*) filter (where vp.is_active and vp.created_at >= from_ts and vp.created_at < to_ts)::bigint as new_period
    from public.volunteer_profiles vp
    join scope_units s on s.id = vp.org_unit_id
  ),
  operation_kpi as (
    select
      count(*) filter (where o.status = 'active'::public.operation_status)::bigint as active_total,
      count(*) filter (where o.created_at >= from_ts and o.created_at < to_ts)::bigint as created_period,
      count(*) filter (
        where o.status = 'completed'::public.operation_status
          and coalesce(o.ends_at, o.updated_at) >= from_ts
          and coalesce(o.ends_at, o.updated_at) < to_ts
      )::bigint as completed_period
    from public.operations o
    join scope_units s on s.id = o.org_unit_id
  ),
  duty_kpi as (
    select
      count(*) filter (where da.assigned_at >= from_ts and da.assigned_at < to_ts)::bigint as assigned_period,
      count(*) filter (
        where da.assigned_at >= from_ts and da.assigned_at < to_ts
          and da.status = 'completed'::public.duty_status
      )::bigint as completed_period
    from public.duty_assignments da
    join public.operation_duties d on d.id = da.duty_id
    join scope_units s on s.id = d.org_unit_id
  ),
  attendance_kpi as (
    select
      count(*) filter (
        where ar.created_at >= from_ts and ar.created_at < to_ts
          and ar.status = 'present'::public.attendance_status
      )::bigint as present_period,
      count(*) filter (
        where ar.created_at >= from_ts and ar.created_at < to_ts
          and ar.status = 'late'::public.attendance_status
      )::bigint as late_period,
      count(*) filter (
        where ar.created_at >= from_ts and ar.created_at < to_ts
          and ar.status = 'absent'::public.attendance_status
      )::bigint as absent_period,
      count(*) filter (
        where ar.created_at >= from_ts and ar.created_at < to_ts
          and ar.status = 'excused'::public.attendance_status
      )::bigint as excused_period
    from public.attendance_records ar
    join scope_units s on s.id = ar.org_unit_id
  ),
  finance_rows as (
    select
      d.id,
      d.currency,
      app_private.effective_donation_amount(d.id) as effective_amount,
      app_private.latest_donation_verification_state(d.id) as verification_state,
      app_private.latest_donation_reconciliation_state(d.id) as reconciliation_state
    from public.donations d
    join scope_units s on s.id = d.org_unit_id
    where d.received_at >= from_ts and d.received_at < to_ts
  ),
  finance_currency as (
    select
      fr.currency,
      count(*)::bigint as donation_count,
      coalesce(sum(fr.effective_amount), 0)::numeric as effective_total,
      coalesce(sum(fr.effective_amount) filter (
        where fr.verification_state = 'verified'::public.donation_verification_state
      ), 0)::numeric as verified_total,
      coalesce(sum(fr.effective_amount) filter (
        where fr.reconciliation_state = 'reconciled'::public.donation_reconciliation_state
      ), 0)::numeric as reconciled_total
    from finance_rows fr
    group by fr.currency
  ),
  finance_json as (
    select coalesce(
      jsonb_object_agg(
        fc.currency,
        jsonb_build_object(
          'donation_count', fc.donation_count,
          'effective_total', fc.effective_total,
          'verified_total', fc.verified_total,
          'reconciled_total', fc.reconciled_total
        )
      ),
      '{}'::jsonb
    ) as value
    from finance_currency fc
  ),
  finance_kpi as (
    select
      (select count(*)::bigint from finance_rows) as donation_count_period,
      (
        select count(*)::bigint
        from public.fundraising_campaigns fc
        join scope_units s on s.id = fc.org_unit_id
        where fc.status = 'active'::public.fundraising_campaign_status
      ) as active_campaigns
  ),
  child_units as (
    select ou.id, ou.level, ou.name, ou.code
    from public.organization_units ou
    where ou.parent_id = p_org_unit_id
      and ou.is_active
    order by ou.name
  ),
  children_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', child.id,
          'name', child.name,
          'level', child.level,
          'code', child.code,
          'members', (
            select count(*)::bigint
            from public.members m
            join public.organization_unit_closure cc on cc.descendant_id = m.org_unit_id
            where cc.ancestor_id = child.id and m.is_active
          ),
          'volunteers', (
            select count(*)::bigint
            from public.volunteer_profiles vp
            join public.organization_unit_closure cc on cc.descendant_id = vp.org_unit_id
            where cc.ancestor_id = child.id and vp.is_active
          ),
          'active_operations', (
            select count(*)::bigint
            from public.operations o
            join public.organization_unit_closure cc on cc.descendant_id = o.org_unit_id
            where cc.ancestor_id = child.id and o.status = 'active'::public.operation_status
          ),
          'participation', (
            select count(*)::bigint
            from public.attendance_records ar
            join public.organization_unit_closure cc on cc.descendant_id = ar.org_unit_id
            where cc.ancestor_id = child.id
              and ar.created_at >= from_ts and ar.created_at < to_ts
              and ar.status in ('present'::public.attendance_status, 'late'::public.attendance_status)
          ),
          'verified_pkr', (
            select coalesce(sum(app_private.effective_donation_amount(d.id)), 0)::numeric
            from public.donations d
            join public.organization_unit_closure cc on cc.descendant_id = d.org_unit_id
            where cc.ancestor_id = child.id
              and d.received_at >= from_ts and d.received_at < to_ts
              and d.currency = 'PKR'
              and app_private.latest_donation_verification_state(d.id) = 'verified'::public.donation_verification_state
          )
        ) order by child.name
      ),
      '[]'::jsonb
    ) as value
    from child_units child
  ),
  trend_source as (
    select date_trunc(bucket_unit, m.issued_at) as bucket, count(*)::bigint as members, 0::bigint as volunteers,
           0::bigint as operations, 0::bigint as participation, 0::bigint as donations, 0::numeric as verified_pkr
    from public.members m
    join scope_units s on s.id = m.org_unit_id
    where m.is_active and m.issued_at >= from_ts and m.issued_at < to_ts
    group by 1

    union all

    select date_trunc(bucket_unit, vp.created_at), 0::bigint, count(*)::bigint, 0::bigint, 0::bigint, 0::bigint, 0::numeric
    from public.volunteer_profiles vp
    join scope_units s on s.id = vp.org_unit_id
    where vp.is_active and vp.created_at >= from_ts and vp.created_at < to_ts
    group by 1

    union all

    select date_trunc(bucket_unit, o.created_at), 0::bigint, 0::bigint, count(*)::bigint, 0::bigint, 0::bigint, 0::numeric
    from public.operations o
    join scope_units s on s.id = o.org_unit_id
    where o.created_at >= from_ts and o.created_at < to_ts
    group by 1

    union all

    select date_trunc(bucket_unit, ar.created_at), 0::bigint, 0::bigint, 0::bigint,
           count(*) filter (where ar.status in ('present'::public.attendance_status, 'late'::public.attendance_status))::bigint,
           0::bigint, 0::numeric
    from public.attendance_records ar
    join scope_units s on s.id = ar.org_unit_id
    where ar.created_at >= from_ts and ar.created_at < to_ts
    group by 1

    union all

    select date_trunc(bucket_unit, d.received_at), 0::bigint, 0::bigint, 0::bigint, 0::bigint,
           count(*)::bigint,
           coalesce(sum(app_private.effective_donation_amount(d.id)) filter (
             where d.currency = 'PKR'
               and app_private.latest_donation_verification_state(d.id) = 'verified'::public.donation_verification_state
           ), 0)::numeric
    from public.donations d
    join scope_units s on s.id = d.org_unit_id
    where d.received_at >= from_ts and d.received_at < to_ts
    group by 1
  ),
  trend_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'bucket', bucket,
          'members', members,
          'volunteers', volunteers,
          'operations', operations,
          'participation', participation,
          'donations', donations,
          'verified_pkr', verified_pkr
        ) order by bucket
      ),
      '[]'::jsonb
    ) as value
    from (
      select
        bucket,
        sum(members)::bigint as members,
        sum(volunteers)::bigint as volunteers,
        sum(operations)::bigint as operations,
        sum(participation)::bigint as participation,
        sum(donations)::bigint as donations,
        sum(verified_pkr)::numeric as verified_pkr
      from trend_source
      group by bucket
    ) x
  ),
  operations_json as (
    select coalesce(
      jsonb_agg(to_jsonb(x) order by x.starts_at desc nulls last, x.created_at desc),
      '[]'::jsonb
    ) as value
    from (
      select
        o.id,
        o.title,
        o.kind,
        o.status,
        o.starts_at,
        o.ends_at,
        o.created_at,
        ou.name as org_unit_name,
        (select count(*)::bigint from public.operation_duties od where od.operation_id = o.id and od.is_active) as duties,
        (
          select count(*)::bigint
          from public.duty_assignments da
          join public.operation_duties od on od.id = da.duty_id
          where od.operation_id = o.id and da.status = 'completed'::public.duty_status
        ) as completed_duties,
        (
          select count(*)::bigint
          from public.attendance_records ar
          where ar.operation_id = o.id
            and ar.status in ('present'::public.attendance_status, 'late'::public.attendance_status)
        ) as participants
      from public.operations o
      join scope_units s on s.id = o.org_unit_id
      join public.organization_units ou on ou.id = o.org_unit_id
      where o.created_at < to_ts
        and coalesce(o.ends_at, o.starts_at, o.created_at) >= from_ts
      order by coalesce(o.starts_at, o.created_at) desc
      limit 25
    ) x
  ),
  campaigns_json as (
    select coalesce(
      jsonb_agg(to_jsonb(x) order by x.created_at desc),
      '[]'::jsonb
    ) as value
    from (
      select
        fc.id,
        fc.campaign_no,
        fc.title,
        fc.status,
        fc.currency,
        fc.target_amount,
        fc.created_at,
        ou.name as org_unit_name,
        count(d.id)::bigint as donation_count,
        coalesce(sum(app_private.effective_donation_amount(d.id)), 0)::numeric as effective_total,
        coalesce(sum(app_private.effective_donation_amount(d.id)) filter (
          where app_private.latest_donation_verification_state(d.id) = 'verified'::public.donation_verification_state
        ), 0)::numeric as verified_total,
        coalesce(sum(app_private.effective_donation_amount(d.id)) filter (
          where app_private.latest_donation_reconciliation_state(d.id) = 'reconciled'::public.donation_reconciliation_state
        ), 0)::numeric as reconciled_total
      from public.fundraising_campaigns fc
      join scope_units s on s.id = fc.org_unit_id
      join public.organization_units ou on ou.id = fc.org_unit_id
      left join public.donations d on d.campaign_id = fc.id
      where fc.created_at < to_ts
        and (
          fc.status in ('active'::public.fundraising_campaign_status, 'paused'::public.fundraising_campaign_status)
          or fc.created_at >= from_ts
          or coalesce(fc.ends_at, fc.updated_at) >= from_ts
        )
      group by fc.id, ou.name
      order by fc.created_at desc
      limit 25
    ) x
  )
  select jsonb_build_object(
    'scope', jsonb_build_object(
      'id', cu.id,
      'parent_id', cu.parent_id,
      'name', cu.name,
      'level', cu.level,
      'code', cu.code,
      'from', from_ts,
      'to', to_ts,
      'bucket', bucket_unit
    ),
    'path', pj.value,
    'kpis', jsonb_build_object(
      'members_active', mk.active_total,
      'members_new', mk.new_period,
      'members_unmapped', um.total,
      'volunteers_active', vk.active_total,
      'volunteers_available', vk.available_total,
      'volunteers_new', vk.new_period,
      'operations_active', ok.active_total,
      'operations_created', ok.created_period,
      'operations_completed', ok.completed_period,
      'duties_assigned', dk.assigned_period,
      'duties_completed', dk.completed_period,
      'attendance_present', ak.present_period,
      'attendance_late', ak.late_period,
      'attendance_absent', ak.absent_period,
      'attendance_excused', ak.excused_period,
      'active_campaigns', fk.active_campaigns,
      'donations_count', fk.donation_count_period,
      'finance_by_currency', fj.value
    ),
    'children', cj.value,
    'trends', tj.value,
    'operations', oj.value,
    'campaigns', cpj.value
  ) into result
  from current_unit cu
  cross join path_json pj
  cross join membership_kpi mk
  cross join unmapped_members um
  cross join volunteer_kpi vk
  cross join operation_kpi ok
  cross join duty_kpi dk
  cross join attendance_kpi ak
  cross join finance_kpi fk
  cross join finance_json fj
  cross join children_json cj
  cross join trend_json tj
  cross join operations_json oj
  cross join campaigns_json cpj;

  return result;
end;
$$;

revoke all on function app_private.get_leadership_dashboard_impl(uuid,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function app_private.get_leadership_dashboard_impl(uuid,timestamptz,timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- Public API wrappers — SECURITY INVOKER; privileged reads remain in app_private.
-- -----------------------------------------------------------------------------

create or replace function public.my_leadership_access()
returns table(
  can_view boolean,
  default_org_unit_id uuid,
  default_org_unit_name text,
  default_org_unit_level public.organization_level
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.my_leadership_access_impl();
$$;

create or replace function public.list_leadership_scopes()
returns table(
  id uuid,
  parent_id uuid,
  level public.organization_level,
  name text,
  code text,
  depth integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from app_private.list_leadership_scopes_impl();
$$;

create or replace function public.get_leadership_dashboard(
  p_org_unit_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.get_leadership_dashboard_impl(p_org_unit_id, p_from, p_to);
$$;

revoke all on function public.my_leadership_access() from public, anon, authenticated;
revoke all on function public.list_leadership_scopes() from public, anon, authenticated;
revoke all on function public.get_leadership_dashboard(uuid,timestamptz,timestamptz) from public, anon, authenticated;

grant execute on function public.my_leadership_access() to authenticated;
grant execute on function public.list_leadership_scopes() to authenticated;
grant execute on function public.get_leadership_dashboard(uuid,timestamptz,timestamptz) to authenticated;

comment on table public.organization_unit_closure is
  'Phase 6 hierarchy closure used for efficient Central → Province → Division → District → Tehsil reporting.';
comment on column public.members.org_unit_id is
  'Canonical tehsil organization scope used for leadership monitoring. Legacy unmapped rows may remain NULL until corrected.';
comment on function public.get_leadership_dashboard(uuid,timestamptz,timestamptz) is
  'Scoped aggregate-only leadership dashboard payload. Does not expose member, volunteer or donor PII.';

commit;
