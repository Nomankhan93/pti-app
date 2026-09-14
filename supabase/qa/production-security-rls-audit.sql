-- PTI Phase 8 — Production security / RLS audit
-- Read-only assertions. Safe to run in Supabase SQL Editor after migrations.

begin;
set local statement_timeout = '30s';

-- All sensitive public tables must have RLS enabled.
do $$
declare
  missing text;
begin
  select string_agg(x.table_name, ', ' order by x.table_name)
  into missing
  from (
    values
      ('members'),
      ('organization_role_assignments'),
      ('audit_events'),
      ('volunteer_profiles'),
      ('operations'),
      ('attendance_sessions'),
      ('attendance_records'),
      ('finance_role_assignments'),
      ('fundraising_campaigns'),
      ('donations'),
      ('donation_verification_events'),
      ('donation_reconciliation_events'),
      ('donation_adjustments'),
      ('donation_receipts'),
      ('notification_messages'),
      ('notification_deliveries'),
      ('production_export_audit')
  ) as x(table_name)
  where not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public'
      and c.relname=x.table_name
      and c.relrowsecurity
  );

  if missing is not null then
    raise exception 'RLS missing on sensitive tables: %', missing;
  end if;
end $$;

-- No direct client writes to privileged ledgers/control tables.
do $$
declare
  exposed text;
begin
  select string_agg(x.table_name, ', ' order by x.table_name)
  into exposed
  from (
    values
      ('public.organization_role_assignments'),
      ('public.audit_events'),
      ('public.finance_role_assignments'),
      ('public.fundraising_campaigns'),
      ('public.donations'),
      ('public.donation_verification_events'),
      ('public.donation_reconciliation_events'),
      ('public.donation_adjustments'),
      ('public.donation_receipts'),
      ('public.notification_messages'),
      ('public.notification_deliveries'),
      ('public.production_export_audit')
  ) as x(table_name)
  where
    pg_catalog.has_table_privilege('anon',x.table_name,'INSERT')
    or pg_catalog.has_table_privilege('anon',x.table_name,'UPDATE')
    or pg_catalog.has_table_privilege('anon',x.table_name,'DELETE')
    or pg_catalog.has_table_privilege('authenticated',x.table_name,'INSERT')
    or pg_catalog.has_table_privilege('authenticated',x.table_name,'UPDATE')
    or pg_catalog.has_table_privilege('authenticated',x.table_name,'DELETE');

  if exposed is not null then
    raise exception 'Direct client write privilege exposed on: %', exposed;
  end if;
end $$;

-- Phase 8 public API must remain SECURITY INVOKER with a pinned search_path.
do $$
declare
  bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname)
  into bad
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname = any(array[
      'my_production_readiness_access',
      'production_health_summary',
      'production_export_audit_events',
      'production_export_finance_ledger',
      'list_production_exports'
    ])
    and (
      p.prosecdef
      or p.proconfig is null
      or p.proconfig::text not like '%search_path=%'
    );

  if bad is not null then
    raise exception 'Phase 8 public wrapper hardening failed for: %', bad;
  end if;
end $$;

-- Phase 8 private implementation functions are definer functions, hidden from
-- anon/public, and callable only through authenticated public wrappers.
do $$
declare
  bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname)
  into bad
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private'
    and p.proname = any(array[
      'my_production_readiness_access_impl',
      'production_health_summary_impl',
      'production_export_audit_events_impl',
      'production_export_finance_ledger_impl',
      'list_production_exports_impl',
      'consume_rate_limit'
    ])
    and (
      not p.prosecdef
      or pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
      or not pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
      or p.proconfig is null
      or p.proconfig::text not like '%search_path=%'
    );

  if bad is not null then
    raise exception 'Phase 8 private function ACL/search_path failure: %', bad;
  end if;
end $$;

-- Phase 7 migration runtime bug must not be present in the installed function.
do $$
declare
  fn text;
begin
  select pg_catalog.pg_get_functiondef(p.oid)
  into fn
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname='list_notification_scopes_impl'
  limit 1;

  if fn is null then
    raise exception 'Phase 7 notification scope function is missing';
  end if;
  if fn ilike '%select distinct ou.id, ou.parent_id, ou.level, ou.name, ou.code%' then
    raise exception 'Phase 7 DISTINCT/ORDER BY migration defect is still installed';
  end if;
end $$;

-- Rate-limited public mutators must remain invoker wrappers.
do $$
declare
  bad text;
begin
  select string_agg(p.proname, ', ' order by p.proname)
  into bad
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname = any(array[
      'save_fundraising_campaign','record_finance_donation','set_donation_verification',
      'set_donation_reconciliation','add_donation_adjustment','issue_donation_receipt',
      'assign_finance_role_by_email','revoke_finance_role','publish_notification',
      'cancel_notification','generate_due_duty_reminders'
    ])
    and p.prosecdef;

  if bad is not null then
    raise exception 'Rate-limited public mutators unexpectedly SECURITY DEFINER: %', bad;
  end if;
end $$;

-- Informational: legacy public SECURITY DEFINER RPCs intentionally retained from
-- pre-Phase-5 modules are reported, not failed. Their allowlist remains covered
-- by the Phase 8 release verifier and prior security stabilization QA.
select count(*) as legacy_authenticated_public_security_definer_rpc_count
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosecdef
  and pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE');

select 'PASS: production security/RLS audit' as result;
rollback;
