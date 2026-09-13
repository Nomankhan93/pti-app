-- PTI Volunteer Registry & Coordinator Workbench smoke checks.
-- Run after migrations. This script is read-only.

-- 1. Core volunteer table exists and is RLS enabled.
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'volunteer_profiles';

-- 2. Every volunteer location must resolve to an active tehsil organization unit.
select count(*) as invalid_volunteer_scopes
from public.volunteer_profiles vp
left join public.geographies g on g.id = vp.geography_id
left join public.organization_units ou on ou.id = vp.org_unit_id
where g.id is null
   or g.kind <> 'tehsil'::public.geography_kind
   or ou.id is null
   or ou.level <> 'tehsil'::public.organization_level
   or ou.geography_id is distinct from vp.geography_id;

-- 3. Member link must match the same authenticated user when present.
select count(*) as mismatched_member_links
from public.volunteer_profiles vp
join public.members m on m.id = vp.member_id
where m.user_id <> vp.user_id;

-- 4. Summary by availability and active state.
select is_active, availability, count(*)
from public.volunteer_profiles
group by is_active, availability
order by is_active desc, availability;

-- 5. Required RPCs should exist.
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'list_volunteers_for_my_scope',
    'save_my_volunteer_profile',
    'set_volunteer_active',
    'my_volunteer_workbench_access'
  )
order by p.proname;
