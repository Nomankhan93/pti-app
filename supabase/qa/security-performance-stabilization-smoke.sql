-- PTI Database Security & Performance Stabilization smoke checks
-- Run after 20260914010000_pti_database_security_performance_stabilization.sql.
-- This file is read-only except for DO-block assertions.

-- -----------------------------------------------------------------------------
-- 1. Required RLS helper privileges.
-- -----------------------------------------------------------------------------
do $$
begin
  if not has_function_privilege('authenticated', 'app_private.can_manage_org_security(uuid)', 'EXECUTE') then
    raise exception 'authenticated cannot execute can_manage_org_security';
  end if;
  if not has_function_privilege('authenticated', 'app_private.can_access_org_unit(uuid,uuid)', 'EXECUTE') then
    raise exception 'authenticated cannot execute can_access_org_unit';
  end if;
  if not has_function_privilege('authenticated', 'app_private.can_view_operation(uuid,uuid)', 'EXECUTE') then
    raise exception 'authenticated cannot execute can_view_operation';
  end if;
  if has_function_privilege('anon', 'app_private.can_manage_org_security(uuid)', 'EXECUTE') then
    raise exception 'anon must not execute can_manage_org_security';
  end if;
  if has_function_privilege('anon', 'app_private.can_access_org_unit(uuid,uuid)', 'EXECUTE') then
    raise exception 'anon must not execute can_access_org_unit';
  end if;
  if has_function_privilege('anon', 'app_private.can_view_operation(uuid,uuid)', 'EXECUTE') then
    raise exception 'anon must not execute can_view_operation';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Geography policy split: anonymous reads only active reference geography.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'geographies'
      and policyname = 'geographies_read_reference'
  ) then
    raise exception 'legacy geographies_read_reference policy still exists';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'geographies'
      and policyname = 'geographies_read_active'
  ) then
    raise exception 'geographies_read_active policy missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'geographies'
      and policyname = 'geographies_read_inactive_org_admin'
  ) then
    raise exception 'geographies_read_inactive_org_admin policy missing';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. RLS policies that depend on auth.uid() should use a statement init-plan.
-- -----------------------------------------------------------------------------
do $$
declare
  policy_record record;
  policy_names text[] := array[
    'geographies_read_inactive_org_admin',
    'organization_role_assignments_read_scoped',
    'audit_events_read_scoped',
    'volunteer_profiles_read_own',
    'operations_read_scoped',
    'operation_coordinators_read_scoped',
    'operation_shifts_read_scoped',
    'operation_teams_read_scoped',
    'operation_team_members_read_scoped',
    'operation_duties_read_scoped',
    'duty_assignments_read_scoped',
    'attendance_sessions_select_scoped',
    'attendance_records_select_scoped_or_self'
  ];
begin
  for policy_record in
    select policyname, lower(coalesce(qual, '')) as qual
    from pg_policies
    where schemaname = 'public'
      and policyname = any(policy_names)
  loop
    if position('select auth.uid()' in policy_record.qual) = 0 then
      raise exception 'Policy % does not show init-plan auth.uid() form: %', policy_record.policyname, policy_record.qual;
    end if;
  end loop;

  if (
    select count(*) from pg_policies
    where schemaname = 'public' and policyname = any(policy_names)
  ) <> array_length(policy_names, 1) then
    raise exception 'One or more optimized RLS policies are missing';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Advisor-requested FK support indexes.
-- -----------------------------------------------------------------------------
do $$
declare
  index_names text[] := array[
    'attendance_records_marked_by_idx',
    'attendance_records_org_unit_id_idx',
    'attendance_records_session_id_idx',
    'attendance_sessions_closed_by_idx',
    'attendance_sessions_created_by_idx',
    'attendance_sessions_org_unit_id_idx',
    'duty_assignments_assigned_by_idx',
    'operation_coordinators_assigned_by_idx',
    'operation_coordinators_revoked_by_idx',
    'operation_duties_created_by_idx',
    'operation_duties_org_unit_id_idx',
    'operation_shifts_created_by_idx',
    'operation_team_members_added_by_idx',
    'operation_team_members_removed_by_idx',
    'operation_teams_created_by_idx',
    'operation_teams_lead_volunteer_id_idx',
    'operations_created_by_idx',
    'organization_role_assignments_assigned_by_idx',
    'organization_role_assignments_revoked_by_idx'
  ];
  index_name text;
begin
  foreach index_name in array index_names loop
    if to_regclass('public.' || index_name) is null then
      raise exception 'Required FK support index missing: %', index_name;
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Intentional SECURITY DEFINER RPC allowlist contract.
-- -----------------------------------------------------------------------------
-- These remain SECURITY DEFINER on purpose. The check ensures:
--   * authenticated can call them,
--   * anon cannot call them,
--   * the function remains SECURITY DEFINER,
--   * a fixed search_path is configured.
do $$
declare
  rpc regprocedure;
  proc_row record;
  rpc_allowlist regprocedure[] := array[
    'public.assign_operation_duty(uuid,uuid)'::regprocedure,
    'public.assign_organization_role(uuid,public.organization_role,uuid,text)'::regprocedure,
    'public.cancel_duty_assignment(uuid,text)'::regprocedure,
    'public.check_in_with_attendance_token(text)'::regprocedure,
    'public.check_out_attendance_record(uuid)'::regprocedure,
    'public.check_out_my_attendance(uuid)'::regprocedure,
    'public.close_attendance_session(uuid)'::regprocedure,
    'public.create_attendance_session(uuid,uuid,timestamptz,timestamptz,timestamptz,boolean)'::regprocedure,
    'public.list_attendance_operations_for_my_scope()'::regprocedure,
    'public.list_attendance_sessions(uuid)'::regprocedure,
    'public.list_my_duty_assignments()'::regprocedure,
    'public.list_my_participation_history()'::regprocedure,
    'public.list_operation_attendance_roster(uuid,uuid)'::regprocedure,
    'public.list_operation_coordinator_candidates(uuid)'::regprocedure,
    'public.list_operations_for_my_scope()'::regprocedure,
    'public.list_volunteers_for_my_scope()'::regprocedure,
    'public.my_attendance_workbench_access()'::regprocedure,
    'public.my_operations_workbench_access()'::regprocedure,
    'public.my_participation_summary()'::regprocedure,
    'public.my_volunteer_workbench_access()'::regprocedure,
    'public.revoke_organization_role(uuid)'::regprocedure,
    'public.save_my_volunteer_profile(uuid,jsonb)'::regprocedure,
    'public.save_operation(uuid,uuid,jsonb)'::regprocedure,
    'public.save_operation_duty(uuid,uuid,uuid,uuid,uuid,jsonb)'::regprocedure,
    'public.save_operation_shift(uuid,uuid,uuid,text,timestamptz,timestamptz,text,integer)'::regprocedure,
    'public.save_operation_team(uuid,uuid,uuid,text,text,uuid)'::regprocedure,
    'public.save_organization_unit(uuid,text,boolean)'::regprocedure,
    'public.set_attendance_record(uuid,uuid,uuid,public.attendance_status,text)'::regprocedure,
    'public.set_operation_coordinator(uuid,uuid,public.operation_coordinator_role,boolean)'::regprocedure,
    'public.set_operation_status(uuid,public.operation_status)'::regprocedure,
    'public.set_operation_team_member(uuid,uuid,boolean)'::regprocedure,
    'public.set_volunteer_active(uuid,boolean,text)'::regprocedure,
    'public.update_my_duty_status(uuid,public.duty_status,text)'::regprocedure
  ];
begin
  if array_length(rpc_allowlist, 1) <> 33 then
    raise exception 'Expected 33 intentional SECURITY DEFINER RPCs';
  end if;

  foreach rpc in array rpc_allowlist loop
    if not has_function_privilege('authenticated', rpc::oid, 'EXECUTE') then
      raise exception 'authenticated EXECUTE missing for %', rpc;
    end if;
    if has_function_privilege('anon', rpc::oid, 'EXECUTE') then
      raise exception 'anon unexpectedly has EXECUTE for %', rpc;
    end if;

    select p.prosecdef, p.proconfig
      into proc_row
    from pg_proc p
    where p.oid = rpc::oid;

    if not proc_row.prosecdef then
      raise exception 'Expected SECURITY DEFINER for %', rpc;
    end if;
    if proc_row.proconfig is null
       or array_to_string(proc_row.proconfig, ',') not like '%search_path=%' then
      raise exception 'Fixed search_path missing for %', rpc;
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 6. Authorization guard presence for privileged mutators.
-- -----------------------------------------------------------------------------
do $$
declare
  function_def text;
begin
  function_def := lower(pg_get_functiondef('public.assign_organization_role(uuid,public.organization_role,uuid,text)'::regprocedure));
  if position('can_manage_org_security' in function_def) = 0 then raise exception 'assign_organization_role guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.revoke_organization_role(uuid)'::regprocedure));
  if position('can_manage_org_security' in function_def) = 0 then raise exception 'revoke_organization_role guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.save_organization_unit(uuid,text,boolean)'::regprocedure));
  if position('can_manage_org_security' in function_def) = 0 then raise exception 'save_organization_unit guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.set_volunteer_active(uuid,boolean,text)'::regprocedure));
  if position('can_manage_volunteers' in function_def) = 0 then raise exception 'set_volunteer_active guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.save_operation(uuid,uuid,jsonb)'::regprocedure));
  if position('can_manage_operation' in function_def) = 0 then raise exception 'save_operation guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.assign_operation_duty(uuid,uuid)'::regprocedure));
  if position('can_manage_operation' in function_def) = 0 then raise exception 'assign_operation_duty guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.create_attendance_session(uuid,uuid,timestamptz,timestamptz,timestamptz,boolean)'::regprocedure));
  if position('can_manage_operation' in function_def) = 0 then raise exception 'create_attendance_session guard missing'; end if;

  function_def := lower(pg_get_functiondef('public.set_attendance_record(uuid,uuid,uuid,public.attendance_status,text)'::regprocedure));
  if position('can_manage_operation' in function_def) = 0 then raise exception 'set_attendance_record guard missing'; end if;
end $$;

-- -----------------------------------------------------------------------------
-- Human-readable inspection queries.
-- -----------------------------------------------------------------------------
select schemaname, tablename, policyname, roles, qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'geographies_read_active',
    'geographies_read_inactive_org_admin',
    'organization_role_assignments_read_scoped',
    'audit_events_read_scoped',
    'volunteer_profiles_read_own',
    'operations_read_scoped',
    'operation_coordinators_read_scoped',
    'operation_shifts_read_scoped',
    'operation_teams_read_scoped',
    'operation_team_members_read_scoped',
    'operation_duties_read_scoped',
    'duty_assignments_read_scoped',
    'attendance_sessions_select_scoped',
    'attendance_records_select_scoped_or_self'
  )
order by tablename, policyname;

select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname like any(array[
    'attendance_%_idx',
    'operation_%_idx',
    'operations_%_idx',
    'duty_assignments_%_idx',
    'organization_role_assignments_%_idx'
  ])
order by indexname;
