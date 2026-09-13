-- PTI Phase 4 — Attendance & Participation smoke checks
-- Run after 20260914000000_pti_attendance_participation.sql.
-- These checks are read-only and should return the expected rows/counts.

-- 1) Core tables should exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('attendance_sessions', 'attendance_records')
order by table_name;

-- 2) Attendance enums should expose the intended state model.
select t.typname as enum_name, e.enumlabel, e.enumsortorder
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in ('attendance_status', 'attendance_source')
order by t.typname, e.enumsortorder;

-- 3) Required RPCs should exist.
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'my_attendance_workbench_access',
    'list_attendance_operations_for_my_scope',
    'list_operation_attendance_roster',
    'list_attendance_sessions',
    'create_attendance_session',
    'close_attendance_session',
    'check_in_with_attendance_token',
    'check_out_my_attendance',
    'set_attendance_record',
    'check_out_attendance_record',
    'list_my_participation_history',
    'my_participation_summary'
  )
order by p.proname;

-- 4) RLS must be enabled on both attendance tables.
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('attendance_sessions', 'attendance_records')
order by c.relname;

-- 5) Direct writes by authenticated users should not have table policies.
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('attendance_sessions', 'attendance_records')
order by tablename, policyname;

-- 6) No duplicate attendance target should exist for a volunteer.
select operation_id, shift_id, volunteer_id, count(*)
from public.attendance_records
group by operation_id, shift_id, volunteer_id
having count(*) > 1;

-- 7) No invalid checkout chronology should exist.
select id, check_in_at, check_out_at
from public.attendance_records
where check_out_at is not null
  and (check_in_at is null or check_out_at < check_in_at);

-- 8) Session windows and late thresholds should be valid.
select id, opens_at, late_after, closes_at
from public.attendance_sessions
where closes_at <= opens_at
   or (late_after is not null and (late_after < opens_at or late_after > closes_at));

-- 9) Phase audit marker should exist after the migration.
select action, entity_type, detail, created_at
from public.audit_events
where action = 'attendance_phase_enabled'
order by created_at desc
limit 5;
