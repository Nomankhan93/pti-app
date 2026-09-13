-- PTI Phase 3 — Operations, Teams & Duties smoke checks
-- Run after 20260913233000_pti_operations_teams_duties.sql.

select typname
from pg_type
where typname in ('operation_kind','operation_status','operation_coordinator_role','duty_priority','duty_status')
order by typname;

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'operations','operation_coordinators','operation_shifts','operation_teams',
    'operation_team_members','operation_duties','duty_assignments'
  )
order by table_name;

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'my_operations_workbench_access','list_operations_for_my_scope',
    'list_operation_coordinator_candidates','list_my_duty_assignments',
    'save_operation','set_operation_status','save_operation_shift','save_operation_team',
    'set_operation_team_member','set_operation_coordinator','save_operation_duty',
    'assign_operation_duty','cancel_duty_assignment','update_my_duty_status'
  )
order by routine_name;

select tablename, policyname, cmd
from pg_policies
where schemaname='public'
  and tablename in (
    'operations','operation_coordinators','operation_shifts','operation_teams',
    'operation_team_members','operation_duties','duty_assignments'
  )
order by tablename, policyname;

select action, entity_type, detail, created_at
from public.audit_events
where action='operations_phase_enabled'
order by created_at desc
limit 1;
