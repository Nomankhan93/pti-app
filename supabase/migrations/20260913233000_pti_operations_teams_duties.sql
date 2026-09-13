-- PTI Digital Operations Platform — Phase 3
-- Operations, Teams & Duties
-- Depends on:
--   20260913210000_pti_organization_rbac_audit_foundation.sql
--   20260913223000_pti_volunteer_registry_coordinator_workbench.sql
-- Attendance/check-in and fundraising are intentionally deferred to later phases.

create type public.operation_kind as enum (
  'long_march',
  'public_gathering',
  'convention',
  'membership_campaign',
  'fundraising_campaign',
  'protest',
  'relief_campaign',
  'other'
);

create type public.operation_status as enum (
  'draft',
  'planned',
  'active',
  'completed',
  'cancelled'
);

create type public.operation_coordinator_role as enum (
  'coordinator',
  'supervisor'
);

create type public.duty_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

create type public.duty_status as enum (
  'assigned',
  'accepted',
  'in_progress',
  'completed',
  'unable',
  'cancelled'
);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  kind public.operation_kind not null default 'other',
  title text not null,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.operation_status not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_title_check check (length(trim(title)) between 3 and 180),
  constraint operations_description_check check (description is null or length(description) <= 5000),
  constraint operations_location_check check (location is null or length(location) <= 500),
  constraint operations_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.operation_coordinators (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.operation_coordinator_role not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  unique(operation_id, user_id, role)
);

create table public.operation_shifts (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  capacity integer,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operation_shifts_name_check check (length(trim(name)) between 2 and 160),
  constraint operation_shifts_dates_check check (ends_at > starts_at),
  constraint operation_shifts_location_check check (location is null or length(location) <= 500),
  constraint operation_shifts_capacity_check check (capacity is null or capacity > 0)
);

create table public.operation_teams (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  name text not null,
  description text,
  lead_volunteer_id uuid references public.volunteer_profiles(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operation_teams_name_check check (length(trim(name)) between 2 and 160),
  constraint operation_teams_description_check check (description is null or length(description) <= 2000)
);

create table public.operation_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.operation_teams(id) on delete cascade,
  volunteer_id uuid not null references public.volunteer_profiles(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete restrict,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  unique(team_id, volunteer_id)
);

create table public.operation_duties (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  team_id uuid references public.operation_teams(id) on delete set null,
  shift_id uuid references public.operation_shifts(id) on delete set null,
  title text not null,
  instructions text,
  location text,
  priority public.duty_priority not null default 'normal',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operation_duties_title_check check (length(trim(title)) between 2 and 180),
  constraint operation_duties_instructions_check check (instructions is null or length(instructions) <= 5000),
  constraint operation_duties_location_check check (location is null or length(location) <= 500),
  constraint operation_duties_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.duty_assignments (
  id uuid primary key default gen_random_uuid(),
  duty_id uuid not null references public.operation_duties(id) on delete cascade,
  volunteer_id uuid not null references public.volunteer_profiles(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  status public.duty_status not null default 'assigned',
  response_note text,
  responded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(duty_id, volunteer_id),
  constraint duty_assignments_note_check check (response_note is null or length(response_note) <= 1000)
);

create index operations_scope_status_idx on public.operations(org_unit_id, status, starts_at);
create index operations_created_at_idx on public.operations(created_at desc);
create index operation_coordinators_operation_idx on public.operation_coordinators(operation_id, is_active);
create index operation_coordinators_user_idx on public.operation_coordinators(user_id, is_active);
create index operation_shifts_operation_idx on public.operation_shifts(operation_id, starts_at);
create index operation_shifts_scope_idx on public.operation_shifts(org_unit_id, is_active);
create index operation_teams_operation_idx on public.operation_teams(operation_id, is_active);
create index operation_teams_scope_idx on public.operation_teams(org_unit_id, is_active);
create index operation_team_members_team_idx on public.operation_team_members(team_id, is_active);
create index operation_team_members_volunteer_idx on public.operation_team_members(volunteer_id, is_active);
create index operation_duties_operation_idx on public.operation_duties(operation_id, is_active);
create index operation_duties_team_idx on public.operation_duties(team_id, is_active);
create index operation_duties_shift_idx on public.operation_duties(shift_id, is_active);
create index duty_assignments_volunteer_idx on public.duty_assignments(volunteer_id, status, assigned_at desc);
create index duty_assignments_duty_idx on public.duty_assignments(duty_id, status);

create trigger operations_set_updated_at
before update on public.operations
for each row execute function app_private.set_updated_at();

create trigger operation_shifts_set_updated_at
before update on public.operation_shifts
for each row execute function app_private.set_updated_at();

create trigger operation_teams_set_updated_at
before update on public.operation_teams
for each row execute function app_private.set_updated_at();

create trigger operation_duties_set_updated_at
before update on public.operation_duties
for each row execute function app_private.set_updated_at();

create trigger duty_assignments_set_updated_at
before update on public.duty_assignments
for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Scoped operations access
-- -----------------------------------------------------------------------------

create or replace function app_private.can_view_operations(
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
    app_private.is_legacy_admin(p_user_id)
    or exists (
      select 1
      from public.organization_role_assignments ra
      join public.organization_units scope_unit on scope_unit.id = ra.org_unit_id
      where ra.user_id = p_user_id
        and ra.is_active
        and scope_unit.is_active
        and ra.role in (
          'super_admin'::public.organization_role,
          'central_leadership'::public.organization_role,
          'national_operations_admin'::public.organization_role,
          'provincial_coordinator'::public.organization_role,
          'divisional_coordinator'::public.organization_role,
          'district_coordinator'::public.organization_role,
          'tehsil_coordinator'::public.organization_role,
          'supervisor'::public.organization_role,
          'auditor'::public.organization_role
        )
        and app_private.is_org_descendant(p_target_org_unit, ra.org_unit_id)
    );
$$;

create or replace function app_private.can_manage_operations(
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
    app_private.is_legacy_admin(p_user_id)
    or exists (
      select 1
      from public.organization_role_assignments ra
      join public.organization_units scope_unit on scope_unit.id = ra.org_unit_id
      where ra.user_id = p_user_id
        and ra.is_active
        and scope_unit.is_active
        and ra.role in (
          'super_admin'::public.organization_role,
          'national_operations_admin'::public.organization_role,
          'provincial_coordinator'::public.organization_role,
          'divisional_coordinator'::public.organization_role,
          'district_coordinator'::public.organization_role,
          'tehsil_coordinator'::public.organization_role,
          'supervisor'::public.organization_role
        )
        and app_private.is_org_descendant(p_target_org_unit, ra.org_unit_id)
    );
$$;

create or replace function app_private.can_view_operation(
  p_user_id uuid,
  p_operation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operations o
    where o.id = p_operation_id
      and (
        app_private.can_view_operations(p_user_id, o.org_unit_id)
        or exists (
          select 1
          from public.operation_coordinators oc
          where oc.operation_id = o.id
            and oc.user_id = p_user_id
            and oc.is_active
        )
      )
  );
$$;

create or replace function app_private.can_manage_operation(
  p_user_id uuid,
  p_operation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operations o
    where o.id = p_operation_id
      and (
        app_private.can_manage_operations(p_user_id, o.org_unit_id)
        or exists (
          select 1
          from public.operation_coordinators oc
          where oc.operation_id = o.id
            and oc.user_id = p_user_id
            and oc.is_active
        )
      )
  );
$$;

revoke all on function app_private.can_view_operations(uuid,uuid) from public, anon, authenticated;
revoke all on function app_private.can_manage_operations(uuid,uuid) from public, anon, authenticated;
revoke all on function app_private.can_view_operation(uuid,uuid) from public, anon, authenticated;
revoke all on function app_private.can_manage_operation(uuid,uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Access + read RPCs
-- -----------------------------------------------------------------------------

create or replace function public.my_operations_workbench_access()
returns table(can_view boolean, can_manage boolean, can_create boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      app_private.is_legacy_admin(auth.uid())
      or exists (
        select 1
        from public.organization_role_assignments ra
        where ra.user_id = auth.uid()
          and ra.is_active
          and ra.role in (
            'super_admin'::public.organization_role,
            'central_leadership'::public.organization_role,
            'national_operations_admin'::public.organization_role,
            'provincial_coordinator'::public.organization_role,
            'divisional_coordinator'::public.organization_role,
            'district_coordinator'::public.organization_role,
            'tehsil_coordinator'::public.organization_role,
            'supervisor'::public.organization_role,
            'auditor'::public.organization_role
          )
      )
      or exists (
        select 1 from public.operation_coordinators oc
        where oc.user_id = auth.uid() and oc.is_active
      )
    ) as can_view,
    (
      app_private.is_legacy_admin(auth.uid())
      or exists (
        select 1
        from public.organization_role_assignments ra
        where ra.user_id = auth.uid()
          and ra.is_active
          and ra.role in (
            'super_admin'::public.organization_role,
            'national_operations_admin'::public.organization_role,
            'provincial_coordinator'::public.organization_role,
            'divisional_coordinator'::public.organization_role,
            'district_coordinator'::public.organization_role,
            'tehsil_coordinator'::public.organization_role,
            'supervisor'::public.organization_role
          )
      )
      or exists (
        select 1 from public.operation_coordinators oc
        where oc.user_id = auth.uid() and oc.is_active
      )
    ) as can_manage,
    (
      app_private.is_legacy_admin(auth.uid())
      or exists (
        select 1
        from public.organization_role_assignments ra
        where ra.user_id = auth.uid()
          and ra.is_active
          and ra.role in (
            'super_admin'::public.organization_role,
            'national_operations_admin'::public.organization_role,
            'provincial_coordinator'::public.organization_role,
            'divisional_coordinator'::public.organization_role,
            'district_coordinator'::public.organization_role,
            'tehsil_coordinator'::public.organization_role,
            'supervisor'::public.organization_role
          )
      )
    ) as can_create;
$$;

create or replace function public.list_operations_for_my_scope()
returns table(
  id uuid,
  org_unit_id uuid,
  org_unit_name text,
  org_level public.organization_level,
  kind public.operation_kind,
  title text,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.operation_status,
  team_count bigint,
  shift_count bigint,
  duty_count bigint,
  assignment_count bigint,
  completed_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.org_unit_id,
    ou.name,
    ou.level,
    o.kind,
    o.title,
    o.description,
    o.location,
    o.starts_at,
    o.ends_at,
    o.status,
    (select count(*) from public.operation_teams t where t.operation_id = o.id and t.is_active),
    (select count(*) from public.operation_shifts s where s.operation_id = o.id and s.is_active),
    (select count(*) from public.operation_duties d where d.operation_id = o.id and d.is_active),
    (select count(*) from public.duty_assignments da join public.operation_duties d on d.id = da.duty_id where d.operation_id = o.id and da.status <> 'cancelled'::public.duty_status),
    (select count(*) from public.duty_assignments da join public.operation_duties d on d.id = da.duty_id where d.operation_id = o.id and da.status = 'completed'::public.duty_status),
    o.created_at,
    o.updated_at
  from public.operations o
  join public.organization_units ou on ou.id = o.org_unit_id
  where auth.uid() is not null
    and app_private.can_view_operation(auth.uid(), o.id)
  order by coalesce(o.starts_at, o.created_at) desc, o.created_at desc;
$$;

create or replace function public.list_operation_coordinator_candidates(p_operation_id uuid)
returns table(
  user_id uuid,
  email text,
  role public.organization_role,
  org_unit_id uuid,
  org_unit_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    ra.user_id,
    p.email,
    ra.role,
    ra.org_unit_id,
    ou.name
  from public.operations o
  join public.organization_role_assignments ra on ra.is_active
  join public.organization_units ou on ou.id = ra.org_unit_id and ou.is_active
  left join public.profiles p on p.id = ra.user_id
  where o.id = p_operation_id
    and app_private.can_manage_operation(auth.uid(), o.id)
    and ra.role in (
      'super_admin'::public.organization_role,
      'central_leadership'::public.organization_role,
      'national_operations_admin'::public.organization_role,
      'provincial_coordinator'::public.organization_role,
      'divisional_coordinator'::public.organization_role,
      'district_coordinator'::public.organization_role,
      'tehsil_coordinator'::public.organization_role,
      'supervisor'::public.organization_role
    )
    and (
      app_private.is_org_descendant(o.org_unit_id, ra.org_unit_id)
      or app_private.is_org_descendant(ra.org_unit_id, o.org_unit_id)
    )
  order by p.email nulls last, ou.name;
$$;

create or replace function public.list_my_duty_assignments()
returns table(
  assignment_id uuid,
  duty_id uuid,
  operation_id uuid,
  operation_title text,
  operation_status public.operation_status,
  team_name text,
  shift_name text,
  duty_title text,
  instructions text,
  location text,
  priority public.duty_priority,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.duty_status,
  response_note text,
  assigned_at timestamptz,
  responded_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    da.id,
    d.id,
    o.id,
    o.title,
    o.status,
    t.name,
    s.name,
    d.title,
    d.instructions,
    coalesce(d.location, s.location, o.location),
    d.priority,
    coalesce(d.starts_at, s.starts_at, o.starts_at),
    coalesce(d.ends_at, s.ends_at, o.ends_at),
    da.status,
    da.response_note,
    da.assigned_at,
    da.responded_at,
    da.started_at,
    da.completed_at
  from public.duty_assignments da
  join public.volunteer_profiles vp on vp.id = da.volunteer_id
  join public.operation_duties d on d.id = da.duty_id
  join public.operations o on o.id = d.operation_id
  left join public.operation_teams t on t.id = d.team_id
  left join public.operation_shifts s on s.id = d.shift_id
  where vp.user_id = auth.uid()
  order by
    case da.status
      when 'assigned'::public.duty_status then 1
      when 'accepted'::public.duty_status then 2
      when 'in_progress'::public.duty_status then 3
      else 4
    end,
    coalesce(d.starts_at, s.starts_at, o.starts_at, da.assigned_at),
    da.assigned_at desc;
$$;

-- -----------------------------------------------------------------------------
-- Management RPCs
-- -----------------------------------------------------------------------------

create or replace function public.save_operation(
  p_operation_id uuid,
  p_org_unit_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_row public.operations;
  result_id uuid;
  clean_title text := trim(coalesce(p_payload->>'title', ''));
  clean_description text := nullif(trim(coalesce(p_payload->>'description', '')), '');
  clean_location text := nullif(trim(coalesce(p_payload->>'location', '')), '');
  clean_kind public.operation_kind;
  clean_status public.operation_status;
  clean_starts timestamptz;
  clean_ends timestamptz;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 12000 then raise exception 'Invalid operation'; end if;
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('title','description','location','kind','status','starts_at','ends_at')) then raise exception 'Unsupported operation field'; end if;
  if length(clean_title) not between 3 and 180 then raise exception 'Operation title is required'; end if;
  if clean_description is not null and length(clean_description) > 5000 then raise exception 'Description is too long'; end if;
  if clean_location is not null and length(clean_location) > 500 then raise exception 'Location is too long'; end if;

  begin clean_kind := coalesce(nullif(p_payload->>'kind',''),'other')::public.operation_kind;
  exception when invalid_text_representation then raise exception 'Invalid operation type'; end;
  begin clean_status := coalesce(nullif(p_payload->>'status',''),'draft')::public.operation_status;
  exception when invalid_text_representation then raise exception 'Invalid operation status'; end;
  begin clean_starts := nullif(p_payload->>'starts_at','')::timestamptz;
  exception when others then raise exception 'Invalid start time'; end;
  begin clean_ends := nullif(p_payload->>'ends_at','')::timestamptz;
  exception when others then raise exception 'Invalid end time'; end;
  if clean_starts is not null and clean_ends is not null and clean_ends <= clean_starts then raise exception 'End time must be after start time'; end if;

  if p_operation_id is null then
    if not app_private.can_manage_operations(actor, p_org_unit_id) then raise exception 'Operations management access required'; end if;
    if not exists(select 1 from public.organization_units where id = p_org_unit_id and is_active) then raise exception 'Invalid organization scope'; end if;

    insert into public.operations(org_unit_id,kind,title,description,location,starts_at,ends_at,status,created_by)
    values(p_org_unit_id,clean_kind,clean_title,clean_description,clean_location,clean_starts,clean_ends,clean_status,actor)
    returning id into result_id;

    insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
    values(actor,'operation_created','operation',result_id,p_org_unit_id,jsonb_build_object('title',clean_title,'kind',clean_kind,'status',clean_status));
  else
    select * into current_row from public.operations where id = p_operation_id for update;
    if not found then raise exception 'Operation not found'; end if;
    if not app_private.can_manage_operation(actor, current_row.id) then raise exception 'Operations management access required'; end if;
    if current_row.org_unit_id <> p_org_unit_id then raise exception 'Operation scope cannot be moved after creation'; end if;

    update public.operations set
      kind=clean_kind,title=clean_title,description=clean_description,location=clean_location,
      starts_at=clean_starts,ends_at=clean_ends,status=clean_status
    where id=current_row.id returning id into result_id;

    insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
    values(actor,'operation_updated','operation',result_id,current_row.org_unit_id,jsonb_build_object('title',clean_title,'status',clean_status));
  end if;

  return result_id;
end;
$$;

create or replace function public.set_operation_status(
  p_operation_id uuid,
  p_status public.operation_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_row public.operations;
begin
  select * into current_row from public.operations where id=p_operation_id for update;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(actor,current_row.id) then raise exception 'Operations management access required'; end if;
  update public.operations set status=p_status where id=current_row.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'operation_status_changed','operation',current_row.id,current_row.org_unit_id,jsonb_build_object('from',current_row.status,'to',p_status));
end;
$$;

create or replace function public.save_operation_shift(
  p_shift_id uuid,
  p_operation_id uuid,
  p_org_unit_id uuid,
  p_name text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text,
  p_capacity integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  op public.operations;
  current_row public.operation_shifts;
  result_id uuid;
  clean_name text := trim(coalesce(p_name,''));
  clean_location text := nullif(trim(coalesce(p_location,'')),'');
begin
  select * into op from public.operations where id=p_operation_id;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(actor,op.id) then raise exception 'Operations management access required'; end if;
  if not app_private.is_org_descendant(p_org_unit_id,op.org_unit_id) then raise exception 'Shift scope must be inside the operation scope'; end if;
  if length(clean_name) not between 2 and 160 then raise exception 'Shift name is required'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception 'Valid shift times are required'; end if;
  if p_capacity is not null and p_capacity <= 0 then raise exception 'Capacity must be positive'; end if;

  if p_shift_id is null then
    insert into public.operation_shifts(operation_id,org_unit_id,name,starts_at,ends_at,location,capacity,created_by)
    values(op.id,p_org_unit_id,clean_name,p_starts_at,p_ends_at,clean_location,p_capacity,actor)
    returning id into result_id;
  else
    select * into current_row from public.operation_shifts where id=p_shift_id and operation_id=op.id for update;
    if not found then raise exception 'Shift not found'; end if;
    update public.operation_shifts set org_unit_id=p_org_unit_id,name=clean_name,starts_at=p_starts_at,ends_at=p_ends_at,location=clean_location,capacity=p_capacity,is_active=true
    where id=current_row.id returning id into result_id;
  end if;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,case when p_shift_id is null then 'operation_shift_created' else 'operation_shift_updated' end,'operation_shift',result_id,p_org_unit_id,jsonb_build_object('operation_id',op.id,'name',clean_name));
  return result_id;
end;
$$;

create or replace function public.save_operation_team(
  p_team_id uuid,
  p_operation_id uuid,
  p_org_unit_id uuid,
  p_name text,
  p_description text,
  p_lead_volunteer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  op public.operations;
  current_row public.operation_teams;
  lead_row public.volunteer_profiles;
  result_id uuid;
  clean_name text := trim(coalesce(p_name,''));
  clean_description text := nullif(trim(coalesce(p_description,'')),'');
begin
  select * into op from public.operations where id=p_operation_id;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(actor,op.id) then raise exception 'Operations management access required'; end if;
  if not app_private.is_org_descendant(p_org_unit_id,op.org_unit_id) then raise exception 'Team scope must be inside the operation scope'; end if;
  if length(clean_name) not between 2 and 160 then raise exception 'Team name is required'; end if;
  if clean_description is not null and length(clean_description)>2000 then raise exception 'Team description is too long'; end if;

  if p_lead_volunteer_id is not null then
    select * into lead_row from public.volunteer_profiles where id=p_lead_volunteer_id and is_active;
    if not found or not app_private.is_org_descendant(lead_row.org_unit_id,p_org_unit_id) then raise exception 'Team leader must be an active volunteer inside team scope'; end if;
  end if;

  if p_team_id is null then
    insert into public.operation_teams(operation_id,org_unit_id,name,description,lead_volunteer_id,created_by)
    values(op.id,p_org_unit_id,clean_name,clean_description,p_lead_volunteer_id,actor)
    returning id into result_id;
  else
    select * into current_row from public.operation_teams where id=p_team_id and operation_id=op.id for update;
    if not found then raise exception 'Team not found'; end if;
    update public.operation_teams set org_unit_id=p_org_unit_id,name=clean_name,description=clean_description,lead_volunteer_id=p_lead_volunteer_id,is_active=true
    where id=current_row.id returning id into result_id;
  end if;

  if p_lead_volunteer_id is not null then
    insert into public.operation_team_members(team_id,volunteer_id,added_by,is_active,removed_at,removed_by)
    values(result_id,p_lead_volunteer_id,actor,true,null,null)
    on conflict(team_id,volunteer_id) do update set is_active=true,removed_at=null,removed_by=null;
  end if;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,case when p_team_id is null then 'operation_team_created' else 'operation_team_updated' end,'operation_team',result_id,p_org_unit_id,jsonb_build_object('operation_id',op.id,'name',clean_name,'lead_volunteer_id',p_lead_volunteer_id));
  return result_id;
end;
$$;

create or replace function public.set_operation_team_member(
  p_team_id uuid,
  p_volunteer_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  team_row public.operation_teams;
  volunteer_row public.volunteer_profiles;
begin
  select * into team_row from public.operation_teams where id=p_team_id for update;
  if not found then raise exception 'Team not found'; end if;
  if not app_private.can_manage_operation(actor,team_row.operation_id) then raise exception 'Operations management access required'; end if;
  select * into volunteer_row from public.volunteer_profiles where id=p_volunteer_id;
  if not found then raise exception 'Volunteer not found'; end if;
  if p_is_active and (not volunteer_row.is_active or not app_private.is_org_descendant(volunteer_row.org_unit_id,team_row.org_unit_id)) then raise exception 'Volunteer is outside team scope or inactive'; end if;

  insert into public.operation_team_members(team_id,volunteer_id,added_by,is_active,removed_at,removed_by)
  values(team_row.id,volunteer_row.id,actor,p_is_active,case when p_is_active then null else now() end,case when p_is_active then null else actor end)
  on conflict(team_id,volunteer_id) do update set
    is_active=excluded.is_active,
    removed_at=excluded.removed_at,
    removed_by=excluded.removed_by,
    added_by=case when excluded.is_active then actor else public.operation_team_members.added_by end,
    joined_at=case when excluded.is_active then now() else public.operation_team_members.joined_at end;

  if not p_is_active and team_row.lead_volunteer_id = volunteer_row.id then
    update public.operation_teams set lead_volunteer_id=null where id=team_row.id;
  end if;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,case when p_is_active then 'operation_team_member_added' else 'operation_team_member_removed' end,'operation_team',team_row.id,team_row.org_unit_id,jsonb_build_object('volunteer_id',volunteer_row.id));
end;
$$;

create or replace function public.set_operation_coordinator(
  p_operation_id uuid,
  p_user_id uuid,
  p_role public.operation_coordinator_role,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  op public.operations;
  qualifies boolean;
begin
  select * into op from public.operations where id=p_operation_id;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(actor,op.id) then raise exception 'Operations management access required'; end if;

  select app_private.is_legacy_admin(p_user_id) or exists(
    select 1
    from public.organization_role_assignments ra
    where ra.user_id=p_user_id and ra.is_active
      and ra.role in (
        'super_admin'::public.organization_role,
        'central_leadership'::public.organization_role,
        'national_operations_admin'::public.organization_role,
        'provincial_coordinator'::public.organization_role,
        'divisional_coordinator'::public.organization_role,
        'district_coordinator'::public.organization_role,
        'tehsil_coordinator'::public.organization_role,
        'supervisor'::public.organization_role
      )
      and (
        app_private.is_org_descendant(op.org_unit_id,ra.org_unit_id)
        or app_private.is_org_descendant(ra.org_unit_id,op.org_unit_id)
      )
  ) into qualifies;

  if p_is_active and not coalesce(qualifies,false) then raise exception 'Coordinator must hold an authorized organization role'; end if;

  insert into public.operation_coordinators(operation_id,user_id,role,assigned_by,is_active,revoked_at,revoked_by)
  values(op.id,p_user_id,p_role,actor,p_is_active,case when p_is_active then null else now() end,case when p_is_active then null else actor end)
  on conflict(operation_id,user_id,role) do update set
    is_active=excluded.is_active,
    assigned_by=case when excluded.is_active then actor else public.operation_coordinators.assigned_by end,
    assigned_at=case when excluded.is_active then now() else public.operation_coordinators.assigned_at end,
    revoked_at=excluded.revoked_at,
    revoked_by=excluded.revoked_by;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,case when p_is_active then 'operation_coordinator_assigned' else 'operation_coordinator_revoked' end,'operation',op.id,op.org_unit_id,jsonb_build_object('user_id',p_user_id,'role',p_role));
end;
$$;

create or replace function public.save_operation_duty(
  p_duty_id uuid,
  p_operation_id uuid,
  p_org_unit_id uuid,
  p_team_id uuid,
  p_shift_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  op public.operations;
  current_row public.operation_duties;
  team_row public.operation_teams;
  shift_row public.operation_shifts;
  result_id uuid;
  clean_title text := trim(coalesce(p_payload->>'title',''));
  clean_instructions text := nullif(trim(coalesce(p_payload->>'instructions','')),'');
  clean_location text := nullif(trim(coalesce(p_payload->>'location','')),'');
  clean_priority public.duty_priority;
  clean_starts timestamptz;
  clean_ends timestamptz;
begin
  select * into op from public.operations where id=p_operation_id;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(actor,op.id) then raise exception 'Operations management access required'; end if;
  if not app_private.is_org_descendant(p_org_unit_id,op.org_unit_id) then raise exception 'Duty scope must be inside the operation scope'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('title','instructions','location','priority','starts_at','ends_at')) then raise exception 'Invalid duty payload'; end if;
  if length(clean_title) not between 2 and 180 then raise exception 'Duty title is required'; end if;
  if clean_instructions is not null and length(clean_instructions)>5000 then raise exception 'Instructions are too long'; end if;
  if clean_location is not null and length(clean_location)>500 then raise exception 'Location is too long'; end if;
  begin clean_priority:=coalesce(nullif(p_payload->>'priority',''),'normal')::public.duty_priority; exception when invalid_text_representation then raise exception 'Invalid duty priority'; end;
  begin clean_starts:=nullif(p_payload->>'starts_at','')::timestamptz; exception when others then raise exception 'Invalid duty start time'; end;
  begin clean_ends:=nullif(p_payload->>'ends_at','')::timestamptz; exception when others then raise exception 'Invalid duty end time'; end;
  if clean_starts is not null and clean_ends is not null and clean_ends<=clean_starts then raise exception 'Duty end must be after start'; end if;

  if p_team_id is not null then
    select * into team_row from public.operation_teams where id=p_team_id and operation_id=op.id and is_active;
    if not found then raise exception 'Invalid team'; end if;
  end if;
  if p_shift_id is not null then
    select * into shift_row from public.operation_shifts where id=p_shift_id and operation_id=op.id and is_active;
    if not found then raise exception 'Invalid shift'; end if;
  end if;

  if p_duty_id is null then
    insert into public.operation_duties(operation_id,org_unit_id,team_id,shift_id,title,instructions,location,priority,starts_at,ends_at,created_by)
    values(op.id,p_org_unit_id,p_team_id,p_shift_id,clean_title,clean_instructions,clean_location,clean_priority,clean_starts,clean_ends,actor)
    returning id into result_id;
  else
    select * into current_row from public.operation_duties where id=p_duty_id and operation_id=op.id for update;
    if not found then raise exception 'Duty not found'; end if;
    update public.operation_duties set org_unit_id=p_org_unit_id,team_id=p_team_id,shift_id=p_shift_id,title=clean_title,instructions=clean_instructions,location=clean_location,priority=clean_priority,starts_at=clean_starts,ends_at=clean_ends,is_active=true
    where id=current_row.id returning id into result_id;
  end if;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,case when p_duty_id is null then 'operation_duty_created' else 'operation_duty_updated' end,'operation_duty',result_id,p_org_unit_id,jsonb_build_object('operation_id',op.id,'title',clean_title,'team_id',p_team_id,'shift_id',p_shift_id));
  return result_id;
end;
$$;

create or replace function public.assign_operation_duty(
  p_duty_id uuid,
  p_volunteer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  duty_row public.operation_duties;
  volunteer_row public.volunteer_profiles;
  assignment_row public.duty_assignments;
  result_id uuid;
begin
  select * into duty_row from public.operation_duties where id=p_duty_id and is_active;
  if not found then raise exception 'Duty not found'; end if;
  if not app_private.can_manage_operation(actor,duty_row.operation_id) then raise exception 'Operations management access required'; end if;
  select * into volunteer_row from public.volunteer_profiles where id=p_volunteer_id and is_active;
  if not found then raise exception 'Active volunteer not found'; end if;
  if not app_private.is_org_descendant(volunteer_row.org_unit_id,duty_row.org_unit_id) then raise exception 'Volunteer is outside duty scope'; end if;
  if duty_row.team_id is not null and not exists(select 1 from public.operation_team_members tm where tm.team_id=duty_row.team_id and tm.volunteer_id=volunteer_row.id and tm.is_active) then raise exception 'Volunteer must be an active member of the duty team'; end if;

  select * into assignment_row from public.duty_assignments where duty_id=duty_row.id and volunteer_id=volunteer_row.id for update;
  if found and assignment_row.status in ('accepted'::public.duty_status,'in_progress'::public.duty_status,'completed'::public.duty_status) then
    return assignment_row.id;
  end if;

  insert into public.duty_assignments(duty_id,volunteer_id,assigned_by,status,response_note,responded_at,started_at,completed_at)
  values(duty_row.id,volunteer_row.id,actor,'assigned',null,null,null,null)
  on conflict(duty_id,volunteer_id) do update set
    assigned_by=actor,assigned_at=now(),status='assigned',response_note=null,responded_at=null,started_at=null,completed_at=null
  returning id into result_id;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'duty_assigned','duty_assignment',result_id,duty_row.org_unit_id,jsonb_build_object('duty_id',duty_row.id,'volunteer_id',volunteer_row.id));
  return result_id;
end;
$$;

create or replace function public.cancel_duty_assignment(
  p_assignment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  assignment_row public.duty_assignments;
  duty_row public.operation_duties;
  clean_reason text := nullif(trim(coalesce(p_reason,'')),'');
begin
  select * into assignment_row from public.duty_assignments where id=p_assignment_id for update;
  if not found then raise exception 'Duty assignment not found'; end if;
  select * into duty_row from public.operation_duties where id=assignment_row.duty_id;
  if not app_private.can_manage_operation(actor,duty_row.operation_id) then raise exception 'Operations management access required'; end if;
  if assignment_row.status='completed'::public.duty_status then raise exception 'Completed assignment cannot be cancelled'; end if;
  if clean_reason is not null and length(clean_reason)>1000 then raise exception 'Reason is too long'; end if;
  update public.duty_assignments set status='cancelled',response_note=clean_reason,responded_at=coalesce(responded_at,now()) where id=assignment_row.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'duty_assignment_cancelled','duty_assignment',assignment_row.id,duty_row.org_unit_id,jsonb_build_object('duty_id',duty_row.id,'volunteer_id',assignment_row.volunteer_id,'reason',clean_reason));
end;
$$;

create or replace function public.update_my_duty_status(
  p_assignment_id uuid,
  p_status public.duty_status,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  assignment_row public.duty_assignments;
  duty_row public.operation_duties;
  volunteer_row public.volunteer_profiles;
  clean_note text := nullif(trim(coalesce(p_note,'')),'');
  allowed boolean := false;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select da.* into assignment_row
  from public.duty_assignments da
  join public.volunteer_profiles vp on vp.id=da.volunteer_id
  where da.id=p_assignment_id and vp.user_id=actor
  for update of da;
  if not found then raise exception 'Duty assignment not found'; end if;
  select * into volunteer_row from public.volunteer_profiles where id=assignment_row.volunteer_id;
  if not volunteer_row.is_active then raise exception 'Volunteer profile is inactive'; end if;
  if clean_note is not null and length(clean_note)>1000 then raise exception 'Note is too long'; end if;

  allowed :=
    (assignment_row.status='assigned'::public.duty_status and p_status in ('accepted'::public.duty_status,'unable'::public.duty_status))
    or (assignment_row.status='accepted'::public.duty_status and p_status in ('in_progress'::public.duty_status,'unable'::public.duty_status))
    or (assignment_row.status='in_progress'::public.duty_status and p_status in ('completed'::public.duty_status,'unable'::public.duty_status));
  if not allowed then raise exception 'Invalid duty status transition'; end if;

  update public.duty_assignments set
    status=p_status,
    response_note=case when clean_note is not null then clean_note else response_note end,
    responded_at=case when p_status in ('accepted'::public.duty_status,'unable'::public.duty_status) then coalesce(responded_at,now()) else responded_at end,
    started_at=case when p_status='in_progress'::public.duty_status then coalesce(started_at,now()) else started_at end,
    completed_at=case when p_status='completed'::public.duty_status then now() else completed_at end
  where id=assignment_row.id;

  select * into duty_row from public.operation_duties where id=assignment_row.duty_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'volunteer_duty_status_changed','duty_assignment',assignment_row.id,duty_row.org_unit_id,jsonb_build_object('from',assignment_row.status,'to',p_status,'duty_id',duty_row.id));
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS: operational managers can read scoped structure; writes stay RPC-only.
-- Volunteers receive assignments through list_my_duty_assignments().
-- -----------------------------------------------------------------------------

alter table public.operations enable row level security;
alter table public.operation_coordinators enable row level security;
alter table public.operation_shifts enable row level security;
alter table public.operation_teams enable row level security;
alter table public.operation_team_members enable row level security;
alter table public.operation_duties enable row level security;
alter table public.duty_assignments enable row level security;

create policy operations_read_scoped on public.operations for select to authenticated
using (app_private.can_view_operation(auth.uid(),id));

create policy operation_coordinators_read_scoped on public.operation_coordinators for select to authenticated
using (app_private.can_view_operation(auth.uid(),operation_id));

create policy operation_shifts_read_scoped on public.operation_shifts for select to authenticated
using (app_private.can_view_operation(auth.uid(),operation_id));

create policy operation_teams_read_scoped on public.operation_teams for select to authenticated
using (app_private.can_view_operation(auth.uid(),operation_id));

create policy operation_team_members_read_scoped on public.operation_team_members for select to authenticated
using (exists(select 1 from public.operation_teams t where t.id=team_id and app_private.can_view_operation(auth.uid(),t.operation_id)));

create policy operation_duties_read_scoped on public.operation_duties for select to authenticated
using (app_private.can_view_operation(auth.uid(),operation_id));

create policy duty_assignments_read_scoped on public.duty_assignments for select to authenticated
using (
  exists(select 1 from public.operation_duties d where d.id=duty_id and app_private.can_view_operation(auth.uid(),d.operation_id))
);

revoke all on public.operations from anon, authenticated;
revoke all on public.operation_coordinators from anon, authenticated;
revoke all on public.operation_shifts from anon, authenticated;
revoke all on public.operation_teams from anon, authenticated;
revoke all on public.operation_team_members from anon, authenticated;
revoke all on public.operation_duties from anon, authenticated;
revoke all on public.duty_assignments from anon, authenticated;

grant select on public.operations to authenticated;
grant select on public.operation_coordinators to authenticated;
grant select on public.operation_shifts to authenticated;
grant select on public.operation_teams to authenticated;
grant select on public.operation_team_members to authenticated;
grant select on public.operation_duties to authenticated;
grant select on public.duty_assignments to authenticated;

revoke all on function public.my_operations_workbench_access() from public, anon;
revoke all on function public.list_operations_for_my_scope() from public, anon;
revoke all on function public.list_operation_coordinator_candidates(uuid) from public, anon;
revoke all on function public.list_my_duty_assignments() from public, anon;
revoke all on function public.save_operation(uuid,uuid,jsonb) from public, anon;
revoke all on function public.set_operation_status(uuid,public.operation_status) from public, anon;
revoke all on function public.save_operation_shift(uuid,uuid,uuid,text,timestamptz,timestamptz,text,integer) from public, anon;
revoke all on function public.save_operation_team(uuid,uuid,uuid,text,text,uuid) from public, anon;
revoke all on function public.set_operation_team_member(uuid,uuid,boolean) from public, anon;
revoke all on function public.set_operation_coordinator(uuid,uuid,public.operation_coordinator_role,boolean) from public, anon;
revoke all on function public.save_operation_duty(uuid,uuid,uuid,uuid,uuid,jsonb) from public, anon;
revoke all on function public.assign_operation_duty(uuid,uuid) from public, anon;
revoke all on function public.cancel_duty_assignment(uuid,text) from public, anon;
revoke all on function public.update_my_duty_status(uuid,public.duty_status,text) from public, anon;

grant execute on function public.my_operations_workbench_access() to authenticated;
grant execute on function public.list_operations_for_my_scope() to authenticated;
grant execute on function public.list_operation_coordinator_candidates(uuid) to authenticated;
grant execute on function public.list_my_duty_assignments() to authenticated;
grant execute on function public.save_operation(uuid,uuid,jsonb) to authenticated;
grant execute on function public.set_operation_status(uuid,public.operation_status) to authenticated;
grant execute on function public.save_operation_shift(uuid,uuid,uuid,text,timestamptz,timestamptz,text,integer) to authenticated;
grant execute on function public.save_operation_team(uuid,uuid,uuid,text,text,uuid) to authenticated;
grant execute on function public.set_operation_team_member(uuid,uuid,boolean) to authenticated;
grant execute on function public.set_operation_coordinator(uuid,uuid,public.operation_coordinator_role,boolean) to authenticated;
grant execute on function public.save_operation_duty(uuid,uuid,uuid,uuid,uuid,jsonb) to authenticated;
grant execute on function public.assign_operation_duty(uuid,uuid) to authenticated;
grant execute on function public.cancel_duty_assignment(uuid,text) to authenticated;
grant execute on function public.update_my_duty_status(uuid,public.duty_status,text) to authenticated;

insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
select null,'operations_phase_enabled','operations_platform',null,central.id,
  jsonb_build_object('phase','3','teams',true,'shifts',true,'duties',true,'attendance',false,'fundraising',false)
from public.organization_units central
where central.level='central'::public.organization_level
order by central.created_at
limit 1;
