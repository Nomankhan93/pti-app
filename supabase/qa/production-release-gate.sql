-- PTI Phase 8 — Database release gate
-- Run after every production migration push and before a tagged release.

begin;
set local statement_timeout = '60s';

-- Required Phase 5–8 tables/functions must exist.
do $$
declare
  missing text;
begin
  select string_agg(x.name, ', ' order by x.name)
  into missing
  from (
    values
      ('public.donations'),
      ('public.donation_receipts'),
      ('public.notification_messages'),
      ('public.notification_deliveries'),
      ('public.organization_unit_closure'),
      ('public.production_export_audit'),
      ('app_private.rate_limit_buckets')
  ) x(name)
  where to_regclass(x.name) is null;

  if missing is not null then
    raise exception 'Release gate missing required relations: %', missing;
  end if;
end $$;

do $$
declare
  missing text;
begin
  select string_agg(x.signature, ', ' order by x.signature)
  into missing
  from (
    values
      ('public.my_production_readiness_access()'),
      ('public.production_health_summary()'),
      ('public.production_export_audit_events(uuid,timestamp with time zone,timestamp with time zone,integer)'),
      ('public.production_export_finance_ledger(uuid,timestamp with time zone,timestamp with time zone,integer)'),
      ('public.list_production_exports(integer)'),
      ('app_private.consume_rate_limit(text,integer,integer)')
  ) x(signature)
  where to_regprocedure(x.signature) is null;

  if missing is not null then
    raise exception 'Release gate missing required functions: %', missing;
  end if;
end $$;

-- Production export ledger is deliberately RPC-only.
do $$
begin
  if pg_catalog.has_table_privilege('authenticated','public.production_export_audit','SELECT')
     or pg_catalog.has_table_privilege('authenticated','public.production_export_audit','INSERT')
     or pg_catalog.has_table_privilege('anon','public.production_export_audit','SELECT') then
    raise exception 'Release gate: production_export_audit has unexpected direct client grants';
  end if;
end $$;

-- No negative ledger values or invalid reconciled state.
do $$
begin
  if exists (
    select 1 from public.donations d
    where app_private.effective_donation_amount(d.id)<0
       or (
         app_private.latest_donation_reconciliation_state(d.id)='reconciled'::public.donation_reconciliation_state
         and app_private.latest_donation_verification_state(d.id)<>'verified'::public.donation_verification_state
       )
  ) then
    raise exception 'Release gate: finance ledger invariant violation';
  end if;
end $$;

-- Public Phase 5–8 wrappers should be invoker functions.
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
      'record_finance_donation','set_donation_verification','set_donation_reconciliation',
      'add_donation_adjustment','issue_donation_receipt','publish_notification',
      'generate_due_duty_reminders','my_leadership_access','leadership_dashboard',
      'my_production_readiness_access','production_health_summary',
      'production_export_audit_events','production_export_finance_ledger','list_production_exports'
    ])
    and p.prosecdef;

  if bad is not null then
    raise exception 'Release gate: public SECURITY DEFINER regression in: %', bad;
  end if;
end $$;

select
  (select count(*) from public.members where is_active) as active_members,
  (select count(*) from public.volunteer_profiles where is_active) as active_volunteers,
  (select count(*) from public.operations where status='active'::public.operation_status) as active_operations,
  (select count(*) from public.donations) as donation_records,
  (select count(*) from public.notification_deliveries where read_at is null and archived_at is null) as unread_notifications,
  (select count(*) from public.production_export_audit where created_at>=now()-interval '24 hours') as exports_last_24h;

select 'PASS: production database release gate' as result;
rollback;
