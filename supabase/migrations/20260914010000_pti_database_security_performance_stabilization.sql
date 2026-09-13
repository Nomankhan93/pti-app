-- PTI Database Security & Performance Stabilization
-- Forward-only hardening after Organization/RBAC, Volunteer, Operations and Attendance phases.
-- Goals:
--   1) fix private helper EXECUTE permissions required by RLS,
--   2) optimize auth.uid() RLS initialization plans,
--   3) add missing FK-supporting indexes reported by Supabase Advisor,
--   4) pin the intended public SECURITY DEFINER RPC ACL/search_path contract,
--   5) preserve currently-unused indexes until production usage data exists.

begin;

-- -----------------------------------------------------------------------------
-- 1. Harden legacy active SECURITY DEFINER helpers.
-- -----------------------------------------------------------------------------
-- These active helpers use schema-qualified application objects, so an empty
-- search_path removes avoidable object-shadowing risk without changing behavior.

alter function app_private.set_updated_at() set search_path = '';
alter function app_private.has_role(uuid, public.app_role) set search_path = '';
alter function app_private.handle_new_user() set search_path = '';
alter function app_private.protect_member_update() set search_path = '';
alter function app_private.next_pti_member_no() set search_path = '';
alter function app_private.self_issue_member() set search_path = '';

-- -----------------------------------------------------------------------------
-- 2. RLS helper execution contract.
-- -----------------------------------------------------------------------------
-- RLS expressions execute as the querying role. Helpers referenced directly by
-- a policy therefore need authenticated EXECUTE permission even though their
-- implementation is SECURITY DEFINER and lives outside the exposed API schema.
-- Anonymous geography reads no longer call an admin helper (see policies below).

revoke all on function app_private.can_manage_org_security(uuid) from public, anon;
revoke all on function app_private.can_access_org_unit(uuid,uuid) from public, anon;
revoke all on function app_private.can_view_operation(uuid,uuid) from public, anon;

grant execute on function app_private.can_manage_org_security(uuid) to authenticated;
grant execute on function app_private.can_access_org_unit(uuid,uuid) to authenticated;
grant execute on function app_private.can_view_operation(uuid,uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. RLS auth init-plan optimization + geography permission fix.
-- -----------------------------------------------------------------------------
-- Supabase Advisor recommends evaluating auth.uid() once per statement via
-- (select auth.uid()) rather than re-evaluating it for every candidate row.

-- Geography: active reference data is public-readable. Inactive rows are only
-- visible to authenticated organization-security admins. Drop names from both
-- the original migration and the earlier manual hotfix, if present.
drop policy if exists geographies_read_reference on public.geographies;
drop policy if exists geographies_read_active on public.geographies;
drop policy if exists geographies_read_inactive_for_org_admin on public.geographies;
drop policy if exists geographies_read_inactive_admin on public.geographies;

create policy geographies_read_active
on public.geographies
for select
to anon, authenticated
using (is_active);

create policy geographies_read_inactive_org_admin
on public.geographies
for select
to authenticated
using (
  not is_active
  and app_private.can_manage_org_security((select auth.uid()))
);

-- Organization role assignments.
drop policy if exists organization_role_assignments_read_scoped
on public.organization_role_assignments;

create policy organization_role_assignments_read_scoped
on public.organization_role_assignments
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.can_manage_org_security((select auth.uid()))
  or app_private.can_access_org_unit((select auth.uid()), org_unit_id)
);

-- Audit log.
drop policy if exists audit_events_read_scoped
on public.audit_events;

create policy audit_events_read_scoped
on public.audit_events
for select
to authenticated
using (
  actor_id = (select auth.uid())
  or app_private.can_manage_org_security((select auth.uid()))
  or (
    org_unit_id is not null
    and app_private.can_access_org_unit((select auth.uid()), org_unit_id)
  )
);

-- Volunteer self-read.
drop policy if exists volunteer_profiles_read_own
on public.volunteer_profiles;

create policy volunteer_profiles_read_own
on public.volunteer_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

-- Operations domain.
drop policy if exists operations_read_scoped on public.operations;
create policy operations_read_scoped
on public.operations
for select
to authenticated
using (app_private.can_view_operation((select auth.uid()), id));

drop policy if exists operation_coordinators_read_scoped on public.operation_coordinators;
create policy operation_coordinators_read_scoped
on public.operation_coordinators
for select
to authenticated
using (app_private.can_view_operation((select auth.uid()), operation_id));

drop policy if exists operation_shifts_read_scoped on public.operation_shifts;
create policy operation_shifts_read_scoped
on public.operation_shifts
for select
to authenticated
using (app_private.can_view_operation((select auth.uid()), operation_id));

drop policy if exists operation_teams_read_scoped on public.operation_teams;
create policy operation_teams_read_scoped
on public.operation_teams
for select
to authenticated
using (app_private.can_view_operation((select auth.uid()), operation_id));

drop policy if exists operation_team_members_read_scoped on public.operation_team_members;
create policy operation_team_members_read_scoped
on public.operation_team_members
for select
to authenticated
using (
  exists (
    select 1
    from public.operation_teams t
    where t.id = team_id
      and app_private.can_view_operation((select auth.uid()), t.operation_id)
  )
);

drop policy if exists operation_duties_read_scoped on public.operation_duties;
create policy operation_duties_read_scoped
on public.operation_duties
for select
to authenticated
using (app_private.can_view_operation((select auth.uid()), operation_id));

drop policy if exists duty_assignments_read_scoped on public.duty_assignments;
create policy duty_assignments_read_scoped
on public.duty_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.operation_duties d
    where d.id = duty_id
      and app_private.can_view_operation((select auth.uid()), d.operation_id)
  )
);

-- Attendance domain.
drop policy if exists attendance_sessions_select_scoped on public.attendance_sessions;
create policy attendance_sessions_select_scoped
on public.attendance_sessions
for select
to authenticated
using (app_private.can_view_operation((select auth.uid()), operation_id));

drop policy if exists attendance_records_select_scoped_or_self on public.attendance_records;
create policy attendance_records_select_scoped_or_self
on public.attendance_records
for select
to authenticated
using (
  app_private.can_view_operation((select auth.uid()), operation_id)
  or exists (
    select 1
    from public.volunteer_profiles v
    where v.id = volunteer_id
      and v.user_id = (select auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- 4. Foreign-key coverage indexes reported by Supabase Performance Advisor.
-- -----------------------------------------------------------------------------
-- Keep these as simple left-most indexes so FK checks/joins can use them.
-- Existing domain/search indexes are intentionally preserved.

create index if not exists attendance_records_marked_by_idx
  on public.attendance_records(marked_by);
create index if not exists attendance_records_org_unit_id_idx
  on public.attendance_records(org_unit_id);
create index if not exists attendance_records_session_id_idx
  on public.attendance_records(session_id);

create index if not exists attendance_sessions_closed_by_idx
  on public.attendance_sessions(closed_by);
create index if not exists attendance_sessions_created_by_idx
  on public.attendance_sessions(created_by);
create index if not exists attendance_sessions_org_unit_id_idx
  on public.attendance_sessions(org_unit_id);

create index if not exists duty_assignments_assigned_by_idx
  on public.duty_assignments(assigned_by);

create index if not exists operation_coordinators_assigned_by_idx
  on public.operation_coordinators(assigned_by);
create index if not exists operation_coordinators_revoked_by_idx
  on public.operation_coordinators(revoked_by);

create index if not exists operation_duties_created_by_idx
  on public.operation_duties(created_by);
create index if not exists operation_duties_org_unit_id_idx
  on public.operation_duties(org_unit_id);

create index if not exists operation_shifts_created_by_idx
  on public.operation_shifts(created_by);

create index if not exists operation_team_members_added_by_idx
  on public.operation_team_members(added_by);
create index if not exists operation_team_members_removed_by_idx
  on public.operation_team_members(removed_by);

create index if not exists operation_teams_created_by_idx
  on public.operation_teams(created_by);
create index if not exists operation_teams_lead_volunteer_id_idx
  on public.operation_teams(lead_volunteer_id);

create index if not exists operations_created_by_idx
  on public.operations(created_by);

create index if not exists organization_role_assignments_assigned_by_idx
  on public.organization_role_assignments(assigned_by);
create index if not exists organization_role_assignments_revoked_by_idx
  on public.organization_role_assignments(revoked_by);

-- -----------------------------------------------------------------------------
-- 5. Pin intended public RPC security contract.
-- -----------------------------------------------------------------------------
-- Supabase Security Advisor flags authenticated SECURITY DEFINER RPCs by design.
-- These RPCs are intentionally authenticated entry points: direct table writes
-- are restricted and authorization/ownership checks live inside each function.
-- We explicitly remove PUBLIC/anon execution, keep authenticated execution, and
-- pin an empty search_path. The accompanying QA verifies this allowlist.

-- Organization / RBAC.
alter function public.assign_organization_role(uuid,public.organization_role,uuid,text) set search_path = '';
alter function public.revoke_organization_role(uuid) set search_path = '';
alter function public.save_organization_unit(uuid,text,boolean) set search_path = '';

revoke all on function public.assign_organization_role(uuid,public.organization_role,uuid,text) from public, anon;
revoke all on function public.revoke_organization_role(uuid) from public, anon;
revoke all on function public.save_organization_unit(uuid,text,boolean) from public, anon;

grant execute on function public.assign_organization_role(uuid,public.organization_role,uuid,text) to authenticated;
grant execute on function public.revoke_organization_role(uuid) to authenticated;
grant execute on function public.save_organization_unit(uuid,text,boolean) to authenticated;

-- Volunteer registry.
alter function public.save_my_volunteer_profile(uuid,jsonb) set search_path = '';
alter function public.list_volunteers_for_my_scope() set search_path = '';
alter function public.set_volunteer_active(uuid,boolean,text) set search_path = '';
alter function public.my_volunteer_workbench_access() set search_path = '';

revoke all on function public.save_my_volunteer_profile(uuid,jsonb) from public, anon;
revoke all on function public.list_volunteers_for_my_scope() from public, anon;
revoke all on function public.set_volunteer_active(uuid,boolean,text) from public, anon;
revoke all on function public.my_volunteer_workbench_access() from public, anon;

grant execute on function public.save_my_volunteer_profile(uuid,jsonb) to authenticated;
grant execute on function public.list_volunteers_for_my_scope() to authenticated;
grant execute on function public.set_volunteer_active(uuid,boolean,text) to authenticated;
grant execute on function public.my_volunteer_workbench_access() to authenticated;

-- Operations / teams / duties.
alter function public.my_operations_workbench_access() set search_path = '';
alter function public.list_operations_for_my_scope() set search_path = '';
alter function public.list_operation_coordinator_candidates(uuid) set search_path = '';
alter function public.list_my_duty_assignments() set search_path = '';
alter function public.save_operation(uuid,uuid,jsonb) set search_path = '';
alter function public.set_operation_status(uuid,public.operation_status) set search_path = '';
alter function public.save_operation_shift(uuid,uuid,uuid,text,timestamptz,timestamptz,text,integer) set search_path = '';
alter function public.save_operation_team(uuid,uuid,uuid,text,text,uuid) set search_path = '';
alter function public.set_operation_team_member(uuid,uuid,boolean) set search_path = '';
alter function public.set_operation_coordinator(uuid,uuid,public.operation_coordinator_role,boolean) set search_path = '';
alter function public.save_operation_duty(uuid,uuid,uuid,uuid,uuid,jsonb) set search_path = '';
alter function public.assign_operation_duty(uuid,uuid) set search_path = '';
alter function public.cancel_duty_assignment(uuid,text) set search_path = '';
alter function public.update_my_duty_status(uuid,public.duty_status,text) set search_path = '';

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

-- Attendance / participation.
alter function public.my_attendance_workbench_access() set search_path = '';
alter function public.list_attendance_operations_for_my_scope() set search_path = '';
alter function public.list_operation_attendance_roster(uuid,uuid) set search_path = '';
alter function public.list_attendance_sessions(uuid) set search_path = '';
alter function public.create_attendance_session(uuid,uuid,timestamptz,timestamptz,timestamptz,boolean) set search_path = '';
alter function public.close_attendance_session(uuid) set search_path = '';
alter function public.check_in_with_attendance_token(text) set search_path = '';
alter function public.check_out_my_attendance(uuid) set search_path = '';
alter function public.set_attendance_record(uuid,uuid,uuid,public.attendance_status,text) set search_path = '';
alter function public.check_out_attendance_record(uuid) set search_path = '';
alter function public.list_my_participation_history() set search_path = '';
alter function public.my_participation_summary() set search_path = '';

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

-- Record migration observability without exposing sensitive details.
insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
select
  null,
  'database_security_performance_stabilized',
  'platform_security',
  null,
  central.id,
  jsonb_build_object(
    'rls_initplan_policies_optimized', 13,
    'fk_support_indexes_added', 19,
    'security_definer_rpc_contract_pinned', 33,
    'unused_indexes_removed', 0
  )
from public.organization_units central
where central.level = 'central'::public.organization_level
order by central.created_at
limit 1;

commit;
