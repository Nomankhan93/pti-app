-- PTI Phase 6 — Leadership Monitoring smoke checks
-- Run in Supabase SQL Editor after 20260914030000_pti_leadership_monitoring.sql.

-- 1. Canonical member scope columns exist.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='geography_id'
  ) then raise exception 'members.geography_id is missing'; end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='org_unit_id'
  ) then raise exception 'members.org_unit_id is missing'; end if;
end $$;

-- 2. Legacy Sindh-only membership district constraint must be gone.
do $$
begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='members' and c.conname='members_district_check'
  ) then raise exception 'Legacy members_district_check still exists'; end if;
end $$;

-- 3. Closure table must contain a self-link for every organization unit.
do $$
declare
  units bigint;
  self_links bigint;
begin
  select count(*) into units from public.organization_units;
  select count(*) into self_links from public.organization_unit_closure where ancestor_id=descendant_id and depth=0;
  if self_links <> units then
    raise exception 'Organization closure self-link mismatch: units %, self-links %', units, self_links;
  end if;
end $$;

-- 4. Every non-central organization unit must be reachable from a central root.
do $$
declare missing_count bigint;
begin
  select count(*) into missing_count
  from public.organization_units ou
  where ou.level <> 'central'::public.organization_level
    and not exists (
      select 1
      from public.organization_units root
      join public.organization_unit_closure c on c.ancestor_id=root.id and c.descendant_id=ou.id
      where root.level='central'::public.organization_level
    );
  if missing_count <> 0 then
    raise exception '% organization units are not reachable from Central', missing_count;
  end if;
end $$;

-- 5. Member scope synchronization trigger exists.
do $$
begin
  if not exists (
    select 1 from pg_trigger tg
    join pg_class t on t.oid=tg.tgrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='members'
      and tg.tgname='members_sync_org_scope' and not tg.tgisinternal
  ) then raise exception 'members_sync_org_scope trigger is missing'; end if;
end $$;

-- 6. Public leadership RPCs are SECURITY INVOKER, not public SECURITY DEFINER endpoints.
do $$
declare bad_count bigint;
begin
  select count(*) into bad_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in ('my_leadership_access','list_leadership_scopes','get_leadership_dashboard')
    and p.prosecdef;
  if bad_count <> 0 then
    raise exception 'One or more public leadership RPCs are SECURITY DEFINER';
  end if;
end $$;

-- 7. Private implementations are SECURITY DEFINER with an empty search_path.
do $$
declare bad_count bigint;
begin
  select count(*) into bad_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private'
    and p.proname in ('my_leadership_access_impl','list_leadership_scopes_impl','get_leadership_dashboard_impl','can_view_leadership')
    and (
      not p.prosecdef
      or not coalesce(p.proconfig, '{}'::text[]) @> array['search_path=']::text[]
    );
  if bad_count <> 0 then
    raise exception 'Leadership private function hardening check failed for % functions', bad_count;
  end if;
end $$;

-- 8. Anonymous role must not execute public leadership RPCs.
do $$
begin
  if has_function_privilege('anon','public.my_leadership_access()','EXECUTE') then
    raise exception 'anon can execute public.my_leadership_access()';
  end if;
  if has_function_privilege('anon','public.list_leadership_scopes()','EXECUTE') then
    raise exception 'anon can execute public.list_leadership_scopes()';
  end if;
  if has_function_privilege('anon','public.get_leadership_dashboard(uuid,timestamptz,timestamptz)','EXECUTE') then
    raise exception 'anon can execute public.get_leadership_dashboard(...)';
  end if;
end $$;

-- 9. Authenticated role must be able to execute only the intended public wrappers.
do $$
begin
  if not has_function_privilege('authenticated','public.my_leadership_access()','EXECUTE') then
    raise exception 'authenticated cannot execute public.my_leadership_access()';
  end if;
  if not has_function_privilege('authenticated','public.list_leadership_scopes()','EXECUTE') then
    raise exception 'authenticated cannot execute public.list_leadership_scopes()';
  end if;
  if not has_function_privilege('authenticated','public.get_leadership_dashboard(uuid,timestamptz,timestamptz)','EXECUTE') then
    raise exception 'authenticated cannot execute public.get_leadership_dashboard(...)';
  end if;
end $$;

-- 10. Closure table is not directly readable by app roles.
do $$
begin
  if has_table_privilege('anon','public.organization_unit_closure','SELECT') then
    raise exception 'anon can SELECT organization_unit_closure';
  end if;
  if has_table_privilege('authenticated','public.organization_unit_closure','SELECT') then
    raise exception 'authenticated can SELECT organization_unit_closure';
  end if;
end $$;

-- Informational rollup quality check: legacy members that could not be safely mapped.
select
  count(*) filter (where is_active and org_unit_id is not null) as mapped_active_members,
  count(*) filter (where is_active and org_unit_id is null) as unmapped_active_members
from public.members;

select 'PTI Phase 6 leadership monitoring smoke checks passed' as result;
