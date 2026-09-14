-- PTI Phase 7 — Notifications & Operational Command Center smoke checks
-- Run after 20260914040000_pti_notifications_command_center.sql is applied.
-- Safe/read-only except for temporary transaction-local assertions (none persisted).

-- 1) Core tables + RLS
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('notification_messages', 'notification_deliveries')
order by c.relname;

-- 2) Client roles must not have direct DML/table read access.
select
  table_name,
  privilege_type,
  grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('notification_messages', 'notification_deliveries')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Expected: zero rows above.

-- 3) Public API must be SECURITY INVOKER.
select
  p.proname,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'my_command_center_access',
    'list_notification_scopes',
    'list_notification_operations',
    'my_notification_unread_count',
    'list_my_notifications',
    'mark_my_notification_read',
    'mark_all_my_notifications_read',
    'archive_my_notification',
    'list_command_center_messages',
    'publish_notification',
    'cancel_notification',
    'generate_due_duty_reminders'
  )
order by p.proname;

-- Expected: security_definer = false for all 12 functions.

-- 4) Private implementations must be SECURITY DEFINER and outside exposed API schema.
select
  p.proname,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private'
  and p.proname in (
    'my_command_center_access_impl',
    'list_notification_scopes_impl',
    'list_notification_operations_impl',
    'my_notification_unread_count_impl',
    'list_my_notifications_impl',
    'mark_my_notification_read_impl',
    'mark_all_my_notifications_read_impl',
    'archive_my_notification_impl',
    'list_command_center_messages_impl',
    'publish_notification_impl',
    'cancel_notification_impl',
    'generate_due_duty_reminders_impl',
    'notify_duty_assignment_trigger',
    'notify_operation_status_trigger'
  )
order by p.proname;

-- Expected: security_definer = true for all rows.

-- 5) Public EXECUTE ACL contract: authenticated yes, anon no.
select
  p.proname,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'my_command_center_access',
    'list_notification_scopes',
    'list_notification_operations',
    'my_notification_unread_count',
    'list_my_notifications',
    'mark_my_notification_read',
    'mark_all_my_notifications_read',
    'archive_my_notification',
    'list_command_center_messages',
    'publish_notification',
    'cancel_notification',
    'generate_due_duty_reminders'
  )
order by p.proname;

-- Expected: authenticated_execute=true and anon_execute=false.

-- 6) Automatic operational triggers.
select
  tg.tgname,
  c.relname as table_name,
  p.proname as trigger_function
from pg_trigger tg
join pg_class c on c.oid = tg.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = tg.tgfoid
where not tg.tgisinternal
  and n.nspname = 'public'
  and tg.tgname in (
    'duty_assignments_notify_assignment',
    'operations_notify_status_change'
  )
order by tg.tgname;

-- 7) Supporting indexes.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('notification_messages', 'notification_deliveries')
order by tablename, indexname;

-- 8) Hard assertions. These raise if the Phase 7 contract is incomplete.
do $$
declare
  public_rpc_count integer;
  wrong_public_security integer;
  missing_trigger_count integer;
  direct_privilege_count integer;
begin
  select count(*) into public_rpc_count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'my_command_center_access','list_notification_scopes','list_notification_operations',
      'my_notification_unread_count','list_my_notifications','mark_my_notification_read',
      'mark_all_my_notifications_read','archive_my_notification','list_command_center_messages',
      'publish_notification','cancel_notification','generate_due_duty_reminders'
    );
  if public_rpc_count <> 12 then
    raise exception 'Expected 12 Phase 7 public RPCs, found %', public_rpc_count;
  end if;

  select count(*) into wrong_public_security
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'my_command_center_access','list_notification_scopes','list_notification_operations',
      'my_notification_unread_count','list_my_notifications','mark_my_notification_read',
      'mark_all_my_notifications_read','archive_my_notification','list_command_center_messages',
      'publish_notification','cancel_notification','generate_due_duty_reminders'
    )
    and p.prosecdef;
  if wrong_public_security <> 0 then
    raise exception 'Phase 7 public RPCs must be SECURITY INVOKER';
  end if;

  select 2 - count(*) into missing_trigger_count
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not tg.tgisinternal
    and n.nspname = 'public'
    and tg.tgname in ('duty_assignments_notify_assignment','operations_notify_status_change');
  if missing_trigger_count <> 0 then
    raise exception 'Missing Phase 7 operational trigger(s): %', missing_trigger_count;
  end if;

  select count(*) into direct_privilege_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('notification_messages','notification_deliveries')
    and grantee in ('anon','authenticated');
  if direct_privilege_count <> 0 then
    raise exception 'Notification tables unexpectedly expose direct client privileges';
  end if;
end;
$$;

select 'PTI Phase 7 notification command-center smoke checks passed.' as result;
