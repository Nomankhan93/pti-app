-- PTI Final Gap Closure / Release Candidate hardening QA
-- Read-only release gate. Safe to run in Supabase SQL Editor after 20260914060000.

begin;
set local statement_timeout = '60s';

-- ---------------------------------------------------------------------------
-- Required schema and RPC contracts
-- ---------------------------------------------------------------------------
do $$
declare
  missing text;
begin
  select string_agg(x.name, ', ' order by x.name)
  into missing
  from (
    values
      ('public.members.public_verify_token'),
      ('public.members.declaration_accepted_at'),
      ('public.members.declaration_version')
  ) x(name)
  where case x.name
    when 'public.members.public_verify_token' then not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='members' and column_name='public_verify_token'
    )
    when 'public.members.declaration_accepted_at' then not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='members' and column_name='declaration_accepted_at'
    )
    when 'public.members.declaration_version' then not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='members' and column_name='declaration_version'
    )
  end;

  if missing is not null then
    raise exception 'Release candidate missing member columns: %', missing;
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
      ('app_private.can_manage_membership_admin(uuid)'),
      ('app_private.protect_member_update()'),
      ('app_private.self_issue_member()'),
      ('public.consume_public_verification_budget(text)'),
      ('public.production_export_members(boolean,text,integer)'),
      ('app_private.production_export_members_impl(boolean,text,integer)'),
      ('app_private.set_donation_verification_impl(uuid,public.donation_verification_state,text)'),
      ('app_private.set_donation_reconciliation_impl(uuid,public.donation_reconciliation_state,text,text)')
  ) x(signature)
  where to_regprocedure(x.signature) is null;

  if missing is not null then
    raise exception 'Release candidate missing required functions: %', missing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Verification-token integrity
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.members
    where public_verify_token is null
       or public_verify_token !~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Release candidate: invalid or missing public verification token';
  end if;

  if exists (
    select public_verify_token
    from public.members
    group by public_verify_token
    having count(*) > 1
  ) then
    raise exception 'Release candidate: duplicate public verification token';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Membership trigger hardening must explicitly protect official authority
-- fields and photo ownership. This checks deployed function definitions.
-- ---------------------------------------------------------------------------
do $$
declare
  update_def text := pg_get_functiondef('app_private.protect_member_update()'::regprocedure);
  insert_def text := pg_get_functiondef('app_private.self_issue_member()'::regprocedure);
begin
  if position('new.designation is distinct from old.designation' in lower(update_def)) = 0
     or position('new.designation_level is distinct from old.designation_level' in lower(update_def)) = 0
     or position('new.designation_area is distinct from old.designation_area' in lower(update_def)) = 0
     or position('new.public_verify_token is distinct from old.public_verify_token' in lower(update_def)) = 0
     or position('new.photo_url is distinct from old.photo_url' in lower(update_def)) = 0 then
    raise exception 'Release candidate: member update protection regression';
  end if;

  if position('new.designation := null' in lower(insert_def)) = 0
     or position('new.designation_level := null' in lower(insert_def)) = 0
     or position('new.designation_area := null' in lower(insert_def)) = 0
     or position('new.public_verify_token :=' in lower(insert_def)) = 0
     or position('new.declaration_accepted_at := now()' in lower(insert_def)) = 0 then
    raise exception 'Release candidate: self-issuance hardening regression';
  end if;
end $$;

-- Canonical membership policies should be active.
do $$
declare
  missing text;
begin
  select string_agg(x.policy, ', ' order by x.policy)
  into missing
  from (
    values
      ('members_select_own_or_membership_admin'),
      ('members_update_own_or_membership_admin'),
      ('members_insert_own_self_issued')
  ) x(policy)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname='public' and p.tablename='members' and p.policyname=x.policy
  );
  if missing is not null then
    raise exception 'Release candidate: missing member policies: %', missing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Public verification budget: only the service role may invoke it.
-- ---------------------------------------------------------------------------
do $$
begin
  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.consume_public_verification_budget(text)',
    'EXECUTE'
  ) then
    raise exception 'Release candidate: service_role cannot consume verification budget';
  end if;

  if pg_catalog.has_function_privilege(
      'authenticated','public.consume_public_verification_budget(text)','EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon','public.consume_public_verification_budget(text)','EXECUTE'
    ) then
    raise exception 'Release candidate: verification-budget RPC exposed to browser roles';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Member export is invoker-facing, authenticated-only and auditable.
-- ---------------------------------------------------------------------------
do $$
declare
  is_definer boolean;
begin
  select p.prosecdef into is_definer
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.oid='public.production_export_members(boolean,text,integer)'::regprocedure;

  if coalesce(is_definer,true) then
    raise exception 'Release candidate: public member export must be SECURITY INVOKER';
  end if;

  if not pg_catalog.has_function_privilege(
      'authenticated','public.production_export_members(boolean,text,integer)','EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'anon','public.production_export_members(boolean,text,integer)','EXECUTE'
    ) then
    raise exception 'Release candidate: member export RPC ACL regression';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public'
      and t.relname='production_export_audit'
      and c.conname='production_export_kind_check'
      and pg_get_constraintdef(c.oid) like '%members_masked%'
      and pg_get_constraintdef(c.oid) like '%members_sensitive%'
  ) then
    raise exception 'Release candidate: member export audit kinds missing';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Finance maker/checker controls must be deployed.
-- ---------------------------------------------------------------------------
do $$
declare
  verify_def text := lower(pg_get_functiondef(
    'app_private.set_donation_verification_impl(uuid,public.donation_verification_state,text)'::regprocedure
  ));
  reconcile_def text := lower(pg_get_functiondef(
    'app_private.set_donation_reconciliation_impl(uuid,public.donation_reconciliation_state,text,text)'::regprocedure
  ));
begin
  if position('donation recorder cannot verify' in verify_def)=0 then
    raise exception 'Release candidate: finance recorder/verifier segregation missing';
  end if;
  if position('donation recorder cannot reconcile' in reconcile_def)=0
     or position('verifier and reconciler must be different users' in reconcile_def)=0 then
    raise exception 'Release candidate: finance reconciliation maker/checker segregation missing';
  end if;
end $$;

-- Informational counts useful during release review.
select
  count(*) filter (where declaration_accepted is not true) as historical_members_without_recorded_declaration,
  count(*) filter (where photo_url is null or photo_url='') as historical_members_without_photo,
  count(*) as total_members
from public.members;

select 'PASS: final gap closure / release candidate database gate' as result;
rollback;
