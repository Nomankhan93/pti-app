-- PTI Digital Operations Platform — Phase 4
-- Attendance & Participation
-- Depends on:
--   20260913210000_pti_organization_rbac_audit_foundation.sql
--   20260913223000_pti_volunteer_registry_coordinator_workbench.sql
--   20260913233000_pti_operations_teams_duties.sql
-- Fundraising remains deferred to Phase 5.

create type public.attendance_status as enum (
  'present',
  'absent',
  'late',
  'excused'
);

create type public.attendance_source as enum (
  'qr',
  'manual'
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  shift_id uuid references public.operation_shifts(id) on delete cascade,
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  token text not null unique,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  late_after timestamptz,
  require_assignment boolean not null default true,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  constraint attendance_sessions_window_check check (closes_at > opens_at),
  constraint attendance_sessions_late_check check (
    late_after is null or (late_after >= opens_at and late_after <= closes_at)
  ),
  constraint attendance_sessions_token_check check (length(token) between 32 and 160)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  shift_id uuid references public.operation_shifts(id) on delete cascade,
  session_id uuid references public.attendance_sessions(id) on delete set null,
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  volunteer_id uuid not null references public.volunteer_profiles(id) on delete cascade,
  status public.attendance_status not null,
  source public.attendance_source not null default 'manual',
  check_in_at timestamptz,
  check_out_at timestamptz,
  note text,
  marked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_note_check check (note is null or length(note) <= 1000),
  constraint attendance_records_checkout_check check (
    check_out_at is null or (check_in_at is not null and check_out_at >= check_in_at)
  ),
  constraint attendance_records_presence_check check (
    status in ('absent'::public.attendance_status, 'excused'::public.attendance_status)
    or check_in_at is not null
  )
);

create unique index attendance_records_operation_volunteer_unique
  on public.attendance_records(operation_id, volunteer_id)
  where shift_id is null;

create unique index attendance_records_shift_volunteer_unique
  on public.attendance_records(shift_id, volunteer_id)
  where shift_id is not null;

create unique index attendance_sessions_active_target_unique
  on public.attendance_sessions(
    operation_id,
    coalesce(shift_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where is_active;

create index attendance_sessions_operation_idx
  on public.attendance_sessions(operation_id, is_active, opens_at desc);
create index attendance_sessions_shift_idx
  on public.attendance_sessions(shift_id, is_active) where shift_id is not null;
create index attendance_sessions_token_idx
  on public.attendance_sessions(token) where is_active;
create index attendance_records_operation_idx
  on public.attendance_records(operation_id, status, created_at desc);
create index attendance_records_volunteer_idx
  on public.attendance_records(volunteer_id, created_at desc);
create index attendance_records_shift_idx
  on public.attendance_records(shift_id, status) where shift_id is not null;

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Eligibility and access helpers
-- -----------------------------------------------------------------------------

create or replace function app_private.volunteer_engaged_in_operation(
  p_volunteer_id uuid,
  p_operation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.operation_team_members tm
      join public.operation_teams t on t.id = tm.team_id
      where tm.volunteer_id = p_volunteer_id
        and tm.is_active
        and t.operation_id = p_operation_id
        and t.is_active
    )
    or exists (
      select 1
      from public.duty_assignments da
      join public.operation_duties d on d.id = da.duty_id
      where da.volunteer_id = p_volunteer_id
        and da.status <> 'cancelled'::public.duty_status
        and d.operation_id = p_operation_id
        and d.is_active
    );
$$;

create or replace function app_private.volunteer_in_operation_scope(
  p_volunteer_id uuid,
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
    from public.volunteer_profiles v
    join public.operations o on o.id = p_operation_id
    where v.id = p_volunteer_id
      and v.is_active
      and app_private.is_org_descendant(v.org_unit_id, o.org_unit_id)
  );
$$;

create or replace function app_private.attendance_shift_belongs_to_operation(
  p_shift_id uuid,
  p_operation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_shift_id is null or exists (
    select 1
    from public.operation_shifts s
    where s.id = p_shift_id
      and s.operation_id = p_operation_id
      and s.is_active
  );
$$;

-- -----------------------------------------------------------------------------
-- Workbench access and summaries
-- -----------------------------------------------------------------------------

create or replace function public.my_attendance_workbench_access()
returns table(can_view boolean, can_manage boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select x.can_view, x.can_manage
  from public.my_operations_workbench_access() x;
$$;

create or replace function public.list_attendance_operations_for_my_scope()
returns table(
  operation_id uuid,
  org_unit_id uuid,
  org_unit_name text,
  operation_title text,
  operation_status public.operation_status,
  starts_at timestamptz,
  ends_at timestamptz,
  engaged_volunteers bigint,
  attendance_records bigint,
  present_count bigint,
  late_count bigint,
  absent_count bigint,
  excused_count bigint,
  checked_out_count bigint,
  active_sessions bigint
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
    o.title,
    o.status,
    o.starts_at,
    o.ends_at,
    (
      select count(distinct x.volunteer_id)
      from (
        select tm.volunteer_id
        from public.operation_team_members tm
        join public.operation_teams t on t.id = tm.team_id
        where t.operation_id = o.id and t.is_active and tm.is_active
        union
        select da.volunteer_id
        from public.duty_assignments da
        join public.operation_duties d on d.id = da.duty_id
        where d.operation_id = o.id and d.is_active and da.status <> 'cancelled'::public.duty_status
      ) x
    )::bigint,
    (select count(*) from public.attendance_records ar where ar.operation_id = o.id)::bigint,
    (select count(*) from public.attendance_records ar where ar.operation_id = o.id and ar.status = 'present'::public.attendance_status)::bigint,
    (select count(*) from public.attendance_records ar where ar.operation_id = o.id and ar.status = 'late'::public.attendance_status)::bigint,
    (select count(*) from public.attendance_records ar where ar.operation_id = o.id and ar.status = 'absent'::public.attendance_status)::bigint,
    (select count(*) from public.attendance_records ar where ar.operation_id = o.id and ar.status = 'excused'::public.attendance_status)::bigint,
    (select count(*) from public.attendance_records ar where ar.operation_id = o.id and ar.check_out_at is not null)::bigint,
    (select count(*) from public.attendance_sessions s where s.operation_id = o.id and s.is_active and s.closes_at >= now())::bigint
  from public.operations o
  join public.organization_units ou on ou.id = o.org_unit_id
  where app_private.can_view_operation(auth.uid(), o.id)
  order by coalesce(o.starts_at, o.created_at) desc, o.title;
$$;

create or replace function public.list_operation_attendance_roster(
  p_operation_id uuid,
  p_shift_id uuid default null
)
returns table(
  volunteer_id uuid,
  full_name text,
  mobile text,
  org_unit_name text,
  is_engaged boolean,
  record_id uuid,
  status public.attendance_status,
  source public.attendance_source,
  check_in_at timestamptz,
  check_out_at timestamptz,
  note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app_private.can_view_operation(auth.uid(), p_operation_id) then
    raise exception 'Attendance access denied';
  end if;

  if not app_private.attendance_shift_belongs_to_operation(p_shift_id, p_operation_id) then
    raise exception 'Shift does not belong to this operation';
  end if;

  return query
  with candidate_ids as (
    select tm.volunteer_id
    from public.operation_team_members tm
    join public.operation_teams t on t.id = tm.team_id
    where t.operation_id = p_operation_id and t.is_active and tm.is_active
    union
    select da.volunteer_id
    from public.duty_assignments da
    join public.operation_duties d on d.id = da.duty_id
    where d.operation_id = p_operation_id
      and d.is_active
      and da.status <> 'cancelled'::public.duty_status
    union
    select ar.volunteer_id
    from public.attendance_records ar
    where ar.operation_id = p_operation_id
      and ((p_shift_id is null and ar.shift_id is null) or ar.shift_id = p_shift_id)
  )
  select
    v.id,
    v.full_name,
    v.mobile,
    ou.name,
    app_private.volunteer_engaged_in_operation(v.id, p_operation_id),
    ar.id,
    ar.status,
    ar.source,
    ar.check_in_at,
    ar.check_out_at,
    ar.note
  from candidate_ids c
  join public.volunteer_profiles v on v.id = c.volunteer_id
  join public.organization_units ou on ou.id = v.org_unit_id
  left join public.attendance_records ar
    on ar.operation_id = p_operation_id
    and ar.volunteer_id = v.id
    and ((p_shift_id is null and ar.shift_id is null) or ar.shift_id = p_shift_id)
  where v.is_active
  order by v.full_name;
end;
$$;

create or replace function public.list_attendance_sessions(p_operation_id uuid)
returns table(
  session_id uuid,
  shift_id uuid,
  shift_name text,
  token text,
  opens_at timestamptz,
  closes_at timestamptz,
  late_after timestamptz,
  require_assignment boolean,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  can_manage boolean;
begin
  if not app_private.can_view_operation(auth.uid(), p_operation_id) then
    raise exception 'Attendance access denied';
  end if;

  can_manage := app_private.can_manage_operation(auth.uid(), p_operation_id);

  return query
  select
    s.id,
    s.shift_id,
    sh.name,
    case when can_manage and s.is_active and s.closes_at >= now() then s.token else null end,
    s.opens_at,
    s.closes_at,
    s.late_after,
    s.require_assignment,
    (s.is_active and s.closes_at >= now()),
    s.created_at
  from public.attendance_sessions s
  left join public.operation_shifts sh on sh.id = s.shift_id
  where s.operation_id = p_operation_id
  order by s.created_at desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Session management
-- -----------------------------------------------------------------------------

create or replace function public.create_attendance_session(
  p_operation_id uuid,
  p_shift_id uuid,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_late_after timestamptz,
  p_require_assignment boolean default true
)
returns table(session_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_row public.operations;
  generated_token text;
  result_id uuid;
begin
  select * into operation_row from public.operations where id = p_operation_id for update;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(auth.uid(), p_operation_id) then raise exception 'Attendance management denied'; end if;
  if operation_row.status in ('completed'::public.operation_status, 'cancelled'::public.operation_status) then
    raise exception 'Attendance sessions cannot be opened for a completed or cancelled operation';
  end if;
  if not app_private.attendance_shift_belongs_to_operation(p_shift_id, p_operation_id) then
    raise exception 'Shift does not belong to this operation';
  end if;
  if p_opens_at is null or p_closes_at is null or p_closes_at <= p_opens_at then raise exception 'Invalid attendance window'; end if;
  if p_late_after is not null and (p_late_after < p_opens_at or p_late_after > p_closes_at) then raise exception 'Late threshold must fall inside the attendance window'; end if;
  if p_require_assignment is null then raise exception 'Assignment requirement is required'; end if;

  -- Expired sessions are effectively closed. Clear them before enforcing one active QR
  -- session per operation/shift target so coordinators are not blocked by stale rows.
  update public.attendance_sessions
  set is_active = false,
      closed_by = coalesce(closed_by, auth.uid()),
      closed_at = coalesce(closed_at, now())
  where operation_id = p_operation_id
    and ((p_shift_id is null and shift_id is null) or shift_id = p_shift_id)
    and is_active
    and closes_at < now();

  generated_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.attendance_sessions(
    operation_id, shift_id, org_unit_id, token, opens_at, closes_at, late_after,
    require_assignment, created_by
  ) values (
    p_operation_id, p_shift_id, operation_row.org_unit_id, generated_token,
    p_opens_at, p_closes_at, p_late_after, p_require_assignment, auth.uid()
  ) returning id into result_id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values (
    auth.uid(), 'attendance_session_opened', 'attendance_session', result_id,
    operation_row.org_unit_id,
    jsonb_build_object('operation_id', p_operation_id, 'shift_id', p_shift_id, 'require_assignment', p_require_assignment)
  );

  return query select result_id, generated_token;
end;
$$;

create or replace function public.close_attendance_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.attendance_sessions;
begin
  select * into session_row from public.attendance_sessions where id = p_session_id for update;
  if not found then raise exception 'Attendance session not found'; end if;
  if not app_private.can_manage_operation(auth.uid(), session_row.operation_id) then raise exception 'Attendance management denied'; end if;

  update public.attendance_sessions
  set is_active = false, closed_by = auth.uid(), closed_at = now()
  where id = p_session_id and is_active;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values (
    auth.uid(), 'attendance_session_closed', 'attendance_session', p_session_id,
    session_row.org_unit_id, jsonb_build_object('operation_id', session_row.operation_id, 'shift_id', session_row.shift_id)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- QR check-in / self checkout
-- -----------------------------------------------------------------------------

create or replace function public.check_in_with_attendance_token(p_token text)
returns table(
  record_id uuid,
  operation_title text,
  shift_name text,
  status public.attendance_status,
  check_in_at timestamptz,
  check_out_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.attendance_sessions;
  volunteer_row public.volunteer_profiles;
  operation_row public.operations;
  existing_row public.attendance_records;
  computed_status public.attendance_status;
  result_id uuid;
  result_check_in timestamptz;
  result_check_out timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_token is null or length(trim(p_token)) < 32 then raise exception 'Invalid attendance token'; end if;

  select * into session_row
  from public.attendance_sessions
  where token = trim(p_token)
  for update;

  if not found or not session_row.is_active then raise exception 'Attendance session is closed or invalid'; end if;
  if now() < session_row.opens_at then raise exception 'Attendance session has not opened yet'; end if;
  if now() > session_row.closes_at then raise exception 'Attendance session has closed'; end if;

  select * into operation_row from public.operations where id = session_row.operation_id;
  if operation_row.status in ('completed'::public.operation_status, 'cancelled'::public.operation_status) then
    raise exception 'This operation is no longer accepting attendance';
  end if;

  select * into volunteer_row
  from public.volunteer_profiles
  where user_id = auth.uid() and is_active;
  if not found then raise exception 'An active volunteer profile is required for check-in'; end if;

  if not app_private.volunteer_in_operation_scope(volunteer_row.id, session_row.operation_id) then
    raise exception 'Your volunteer profile is outside this operation scope';
  end if;

  if session_row.require_assignment
     and not app_private.volunteer_engaged_in_operation(volunteer_row.id, session_row.operation_id) then
    raise exception 'This attendance session is limited to assigned operation volunteers';
  end if;

  computed_status := case
    when session_row.late_after is not null and now() > session_row.late_after then 'late'::public.attendance_status
    else 'present'::public.attendance_status
  end;

  select * into existing_row
  from public.attendance_records ar
  where ar.operation_id = session_row.operation_id
    and ar.volunteer_id = volunteer_row.id
    and (
      (session_row.shift_id is null and ar.shift_id is null)
      or ar.shift_id = session_row.shift_id
    )
  for update;

  if found then
    update public.attendance_records
    set session_id = session_row.id,
        status = computed_status,
        source = 'qr'::public.attendance_source,
        check_in_at = coalesce(existing_row.check_in_at, now()),
        note = case when existing_row.source = 'manual'::public.attendance_source then existing_row.note else null end,
        marked_by = null
    where id = existing_row.id
    returning id, check_in_at, check_out_at into result_id, result_check_in, result_check_out;
  else
    insert into public.attendance_records(
      operation_id, shift_id, session_id, org_unit_id, volunteer_id,
      status, source, check_in_at
    ) values (
      session_row.operation_id, session_row.shift_id, session_row.id,
      session_row.org_unit_id, volunteer_row.id,
      computed_status, 'qr'::public.attendance_source, now()
    ) returning id, check_in_at, check_out_at into result_id, result_check_in, result_check_out;
  end if;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values (
    auth.uid(), 'attendance_qr_checked_in', 'attendance_record', result_id,
    session_row.org_unit_id,
    jsonb_build_object('operation_id', session_row.operation_id, 'shift_id', session_row.shift_id, 'status', computed_status)
  );

  return query
  select result_id, operation_row.title, sh.name, computed_status, result_check_in, result_check_out
  from (select 1) x
  left join public.operation_shifts sh on sh.id = session_row.shift_id;
end;
$$;

create or replace function public.check_out_my_attendance(p_record_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_row public.attendance_records;
  volunteer_id_value uuid;
  result_time timestamptz;
begin
  select id into volunteer_id_value from public.volunteer_profiles where user_id = auth.uid() and is_active;
  if volunteer_id_value is null then raise exception 'Active volunteer profile required'; end if;

  select * into record_row from public.attendance_records where id = p_record_id for update;
  if not found or record_row.volunteer_id <> volunteer_id_value then raise exception 'Attendance record not found'; end if;
  if record_row.status not in ('present'::public.attendance_status, 'late'::public.attendance_status) or record_row.check_in_at is null then
    raise exception 'Only checked-in attendance can be checked out';
  end if;

  result_time := coalesce(record_row.check_out_at, now());
  update public.attendance_records set check_out_at = result_time where id = p_record_id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values (
    auth.uid(), 'attendance_self_checked_out', 'attendance_record', p_record_id,
    record_row.org_unit_id, jsonb_build_object('operation_id', record_row.operation_id, 'shift_id', record_row.shift_id)
  );

  return result_time;
end;
$$;

-- -----------------------------------------------------------------------------
-- Coordinator manual attendance
-- -----------------------------------------------------------------------------

create or replace function public.set_attendance_record(
  p_operation_id uuid,
  p_shift_id uuid,
  p_volunteer_id uuid,
  p_status public.attendance_status,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_row public.operations;
  volunteer_row public.volunteer_profiles;
  existing_row public.attendance_records;
  result_id uuid;
  clean_note text := nullif(trim(coalesce(p_note, '')), '');
  attendance_time timestamptz;
begin
  select * into operation_row from public.operations where id = p_operation_id;
  if not found then raise exception 'Operation not found'; end if;
  if not app_private.can_manage_operation(auth.uid(), p_operation_id) then raise exception 'Attendance management denied'; end if;
  if not app_private.attendance_shift_belongs_to_operation(p_shift_id, p_operation_id) then raise exception 'Shift does not belong to this operation'; end if;
  if p_status is null then raise exception 'Attendance status is required'; end if;
  if clean_note is not null and length(clean_note) > 1000 then raise exception 'Attendance note is too long'; end if;

  select * into volunteer_row from public.volunteer_profiles where id = p_volunteer_id and is_active;
  if not found then raise exception 'Active volunteer not found'; end if;
  if not app_private.volunteer_in_operation_scope(p_volunteer_id, p_operation_id) then raise exception 'Volunteer is outside this operation scope'; end if;

  select * into existing_row
  from public.attendance_records ar
  where ar.operation_id = p_operation_id
    and ar.volunteer_id = p_volunteer_id
    and ((p_shift_id is null and ar.shift_id is null) or ar.shift_id = p_shift_id)
  for update;

  attendance_time := case
    when p_status in ('present'::public.attendance_status, 'late'::public.attendance_status)
      then coalesce(existing_row.check_in_at, now())
    else null
  end;

  if found then
    update public.attendance_records
    set status = p_status,
        source = 'manual'::public.attendance_source,
        check_in_at = attendance_time,
        check_out_at = case when attendance_time is null then null else existing_row.check_out_at end,
        note = clean_note,
        marked_by = auth.uid(),
        session_id = case when existing_row.source = 'qr'::public.attendance_source then existing_row.session_id else null end
    where id = existing_row.id
    returning id into result_id;
  else
    insert into public.attendance_records(
      operation_id, shift_id, org_unit_id, volunteer_id, status,
      source, check_in_at, note, marked_by
    ) values (
      p_operation_id, p_shift_id, operation_row.org_unit_id, p_volunteer_id,
      p_status, 'manual'::public.attendance_source, attendance_time, clean_note, auth.uid()
    ) returning id into result_id;
  end if;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values (
    auth.uid(), 'attendance_manually_marked', 'attendance_record', result_id,
    operation_row.org_unit_id,
    jsonb_build_object('operation_id', p_operation_id, 'shift_id', p_shift_id, 'volunteer_id', p_volunteer_id, 'status', p_status)
  );

  return result_id;
end;
$$;

create or replace function public.check_out_attendance_record(p_record_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_row public.attendance_records;
  result_time timestamptz;
begin
  select * into record_row from public.attendance_records where id = p_record_id for update;
  if not found then raise exception 'Attendance record not found'; end if;
  if not app_private.can_manage_operation(auth.uid(), record_row.operation_id) then raise exception 'Attendance management denied'; end if;
  if record_row.status not in ('present'::public.attendance_status, 'late'::public.attendance_status) or record_row.check_in_at is null then
    raise exception 'Only checked-in attendance can be checked out';
  end if;

  result_time := coalesce(record_row.check_out_at, now());
  update public.attendance_records set check_out_at = result_time, marked_by = auth.uid() where id = p_record_id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values (
    auth.uid(), 'attendance_manager_checked_out', 'attendance_record', p_record_id,
    record_row.org_unit_id, jsonb_build_object('operation_id', record_row.operation_id, 'shift_id', record_row.shift_id)
  );

  return result_time;
end;
$$;

-- -----------------------------------------------------------------------------
-- Volunteer participation history
-- -----------------------------------------------------------------------------

create or replace function public.list_my_participation_history()
returns table(
  record_id uuid,
  operation_id uuid,
  operation_title text,
  operation_kind public.operation_kind,
  operation_status public.operation_status,
  shift_id uuid,
  shift_name text,
  attendance_status public.attendance_status,
  attendance_source public.attendance_source,
  check_in_at timestamptz,
  check_out_at timestamptz,
  note text,
  operation_starts_at timestamptz,
  operation_ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ar.id,
    o.id,
    o.title,
    o.kind,
    o.status,
    ar.shift_id,
    sh.name,
    ar.status,
    ar.source,
    ar.check_in_at,
    ar.check_out_at,
    ar.note,
    o.starts_at,
    o.ends_at
  from public.attendance_records ar
  join public.volunteer_profiles v on v.id = ar.volunteer_id
  join public.operations o on o.id = ar.operation_id
  left join public.operation_shifts sh on sh.id = ar.shift_id
  where v.user_id = auth.uid()
  order by coalesce(ar.check_in_at, ar.created_at) desc;
$$;

create or replace function public.my_participation_summary()
returns table(
  operations_participated bigint,
  present_count bigint,
  late_count bigint,
  excused_count bigint,
  completed_duties bigint,
  total_hours numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select id from public.volunteer_profiles where user_id = auth.uid()
  ), attendance as (
    select ar.*
    from public.attendance_records ar
    join me on me.id = ar.volunteer_id
  )
  select
    count(distinct operation_id) filter (where status in ('present'::public.attendance_status, 'late'::public.attendance_status))::bigint,
    count(*) filter (where status = 'present'::public.attendance_status)::bigint,
    count(*) filter (where status = 'late'::public.attendance_status)::bigint,
    count(*) filter (where status = 'excused'::public.attendance_status)::bigint,
    (
      select count(*)::bigint
      from public.duty_assignments da
      join me on me.id = da.volunteer_id
      where da.status = 'completed'::public.duty_status
    ),
    round(coalesce(sum(
      case
        when check_in_at is not null and check_out_at is not null
          then extract(epoch from (check_out_at - check_in_at)) / 3600.0
        else 0
      end
    ), 0)::numeric, 2)
  from attendance;
$$;

-- -----------------------------------------------------------------------------
-- RLS: managers see scoped records, volunteers only see their own attendance.
-- Direct writes are intentionally disabled; all mutations use audited RPCs.
-- -----------------------------------------------------------------------------

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy attendance_sessions_select_scoped
on public.attendance_sessions
for select
to authenticated
using (app_private.can_view_operation(auth.uid(), operation_id));

create policy attendance_records_select_scoped_or_self
on public.attendance_records
for select
to authenticated
using (
  app_private.can_view_operation(auth.uid(), operation_id)
  or exists (
    select 1 from public.volunteer_profiles v
    where v.id = volunteer_id and v.user_id = auth.uid()
  )
);

revoke insert, update, delete on public.attendance_sessions from anon, authenticated;
revoke insert, update, delete on public.attendance_records from anon, authenticated;

grant select on public.attendance_sessions to authenticated;
grant select on public.attendance_records to authenticated;

revoke all on function public.my_attendance_workbench_access() from public, anon;
revoke all on function public.list_attendance_operations_for_my_scope() from public, anon;
revoke all on function public.list_operation_attendance_roster(uuid,uuid) from public, anon;
revoke all on function public.list_attendance_sessions(uuid) from public, anon;
revoke all on function public.create_attendance_session(uuid,uuid,timestamptz,timestamptz,timestamptz,boolean) from public, anon;
revoke all on function public.close_attendance_session(uuid) from public, anon;
revoke all on function public.check_in_with_attendance_token(text) from public, anon;
revoke all on function public.check_out_my_attendance(uuid) from public, anon;
revoke all on function public.set_attendance_record(uuid,uuid,uuid,public.attendance_status,text) from public, anon;
revoke all on function public.check_out_attendance_record(uuid) from public, anon;
revoke all on function public.list_my_participation_history() from public, anon;
revoke all on function public.my_participation_summary() from public, anon;

grant execute on function public.my_attendance_workbench_access() to authenticated;
grant execute on function public.list_attendance_operations_for_my_scope() to authenticated;
grant execute on function public.list_operation_attendance_roster(uuid,uuid) to authenticated;
grant execute on function public.list_attendance_sessions(uuid) to authenticated;
grant execute on function public.create_attendance_session(uuid,uuid,timestamptz,timestamptz,timestamptz,boolean) to authenticated;
grant execute on function public.close_attendance_session(uuid) to authenticated;
grant execute on function public.check_in_with_attendance_token(text) to authenticated;
grant execute on function public.check_out_my_attendance(uuid) to authenticated;
grant execute on function public.set_attendance_record(uuid,uuid,uuid,public.attendance_status,text) to authenticated;
grant execute on function public.check_out_attendance_record(uuid) to authenticated;
grant execute on function public.list_my_participation_history() to authenticated;
grant execute on function public.my_participation_summary() to authenticated;

insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
select null, 'attendance_phase_enabled', 'operations_platform', null, central.id,
  jsonb_build_object('phase','4','attendance',true,'qr_check_in',true,'participation_history',true,'fundraising',false)
from public.organization_units central
where central.level = 'central'::public.organization_level
order by central.created_at
limit 1;
