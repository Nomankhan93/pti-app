-- PTI Phase 5 — Fundraising & Finance Ledger smoke checks
-- Run in Supabase SQL Editor after 20260914020000_pti_fundraising_finance_ledger.sql.
-- These are metadata/invariant checks and do not require a logged-in app session.

-- 1) Phase 5 tables should exist.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'finance_role_assignments',
    'fundraising_campaigns',
    'donations',
    'donation_verification_events',
    'donation_reconciliation_events',
    'donation_adjustments',
    'donation_receipts'
  )
order by table_name;
-- Expected: 7 rows.

-- 2) RLS must be enabled on every Phase 5 table.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'finance_role_assignments',
    'fundraising_campaigns',
    'donations',
    'donation_verification_events',
    'donation_reconciliation_events',
    'donation_adjustments',
    'donation_receipts'
  )
order by c.relname;
-- Expected: 7 rows, every rls_enabled=true.

-- 3) Authenticated receives SELECT only; no direct finance-table writes.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'authenticated'
  and table_schema = 'public'
  and table_name in (
    'finance_role_assignments',
    'fundraising_campaigns',
    'donations',
    'donation_verification_events',
    'donation_reconciliation_events',
    'donation_adjustments',
    'donation_receipts'
  )
order by table_name, privilege_type;
-- Expected: SELECT only.

-- 4) Append-only guards protect the base ledger and all financial histories.
select event_object_table as table_name, trigger_name
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'donations_append_only_guard',
    'donation_verification_events_append_only_guard',
    'donation_reconciliation_events_append_only_guard',
    'donation_adjustments_append_only_guard',
    'donation_receipts_append_only_guard'
  )
order by event_object_table, trigger_name;
-- Expected: 5 rows.

-- 5) Only RLS-facing private helpers are executable by authenticated users.
select
  p.proname,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  coalesce(array_to_string(p.proacl,','),'') !~ '(^|,)=X/' as public_exec_revoked,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private'
  and p.proname in ('can_view_finance','can_admin_finance')
order by p.proname;
-- Expected: authenticated_exec=true, anon_exec=false, public_exec_revoked=true,
-- security_definer=true, and proconfig contains search_path="".

-- 6) Public API wrappers must be SECURITY INVOKER, not public SECURITY DEFINER RPCs.
select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'my_finance_workbench_access',
    'list_fundraising_campaigns_for_my_scope',
    'list_finance_donations',
    'list_donation_adjustments',
    'list_donation_receipts',
    'list_donation_workflow_events',
    'get_finance_receipt',
    'list_finance_role_assignments_for_my_scope',
    'save_fundraising_campaign',
    'record_finance_donation',
    'set_donation_verification',
    'set_donation_reconciliation',
    'add_donation_adjustment',
    'issue_donation_receipt',
    'assign_finance_role_by_email',
    'revoke_finance_role'
  )
order by p.proname;
-- Expected: 16 rows, security_definer=false, proconfig contains search_path="".

-- 7) Private implementations must be SECURITY DEFINER with a pinned empty search_path.
select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private'
  and p.proname in (
    'my_finance_workbench_access_impl',
    'list_fundraising_campaigns_for_my_scope_impl',
    'list_finance_donations_impl',
    'list_donation_adjustments_impl',
    'list_donation_receipts_impl',
    'list_donation_workflow_events_impl',
    'get_finance_receipt_impl',
    'list_finance_role_assignments_for_my_scope_impl',
    'save_fundraising_campaign_impl',
    'record_finance_donation_impl',
    'set_donation_verification_impl',
    'set_donation_reconciliation_impl',
    'add_donation_adjustment_impl',
    'issue_donation_receipt_impl',
    'assign_finance_role_by_email_impl',
    'revoke_finance_role_impl'
  )
order by p.proname;
-- Expected: 16 rows, security_definer=true, proconfig contains search_path="".

-- 8) Public wrapper ACL: authenticated yes, anon/public no.
select
  p.proname,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  coalesce(array_to_string(p.proacl,','),'') !~ '(^|,)=X/' as public_exec_revoked
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'my_finance_workbench_access',
    'list_fundraising_campaigns_for_my_scope',
    'list_finance_donations',
    'list_donation_adjustments',
    'list_donation_receipts',
    'list_donation_workflow_events',
    'get_finance_receipt',
    'list_finance_role_assignments_for_my_scope',
    'save_fundraising_campaign',
    'record_finance_donation',
    'set_donation_verification',
    'set_donation_reconciliation',
    'add_donation_adjustment',
    'issue_donation_receipt',
    'assign_finance_role_by_email',
    'revoke_finance_role'
  )
order by p.proname;
-- Expected: 16 rows; authenticated_exec=true, anon_exec=false, public_exec_revoked=true.

-- 9) Private implementation ACL: authenticated wrapper callers yes; anon/public no.
-- app_private is not an exposed PostgREST API schema.
select
  p.proname,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_exec,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  coalesce(array_to_string(p.proacl,','),'') !~ '(^|,)=X/' as public_exec_revoked
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'app_private'
  and p.proname in (
    'my_finance_workbench_access_impl',
    'list_fundraising_campaigns_for_my_scope_impl',
    'list_finance_donations_impl',
    'list_donation_adjustments_impl',
    'list_donation_receipts_impl',
    'list_donation_workflow_events_impl',
    'get_finance_receipt_impl',
    'list_finance_role_assignments_for_my_scope_impl',
    'save_fundraising_campaign_impl',
    'record_finance_donation_impl',
    'set_donation_verification_impl',
    'set_donation_reconciliation_impl',
    'add_donation_adjustment_impl',
    'issue_donation_receipt_impl',
    'assign_finance_role_by_email_impl',
    'revoke_finance_role_impl'
  )
order by p.proname;
-- Expected: 16 rows; authenticated_exec=true, anon_exec=false, public_exec_revoked=true.

-- 10) Finance RLS policies should use init-plan-safe auth.uid() evaluation.
select schemaname, tablename, policyname, qual
from pg_policies
where schemaname = 'public'
  and tablename in (
    'finance_role_assignments',
    'fundraising_campaigns',
    'donations',
    'donation_verification_events',
    'donation_reconciliation_events',
    'donation_adjustments',
    'donation_receipts'
  )
order by tablename, policyname;
-- Expected: auth.uid() references, where present, are wrapped as (SELECT auth.uid()).

-- 11) FK/search indexes should cover the Phase 5 references.
select schemaname, tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'finance_role_assignments',
    'fundraising_campaigns',
    'donations',
    'donation_verification_events',
    'donation_reconciliation_events',
    'donation_adjustments',
    'donation_receipts'
  )
order by tablename, indexname;

-- 12) Donation ledger rows must not be directly mutable by authenticated clients.
select
  has_table_privilege('authenticated','public.donations','INSERT') as auth_insert,
  has_table_privilege('authenticated','public.donations','UPDATE') as auth_update,
  has_table_privilege('authenticated','public.donations','DELETE') as auth_delete;
-- Expected: all false.

-- 13) No anonymous direct table privileges should exist on finance tables.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
  and table_name in (
    'finance_role_assignments',
    'fundraising_campaigns',
    'donations',
    'donation_verification_events',
    'donation_reconciliation_events',
    'donation_adjustments',
    'donation_receipts'
  )
order by table_name, privilege_type;
-- Expected: 0 rows.
