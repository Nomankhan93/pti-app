-- PTI Volunteer Registry & Coordinator Workbench
-- Phase 2 of the PTI Digital Operations Platform.
-- Builds on 20260913210000_pti_organization_rbac_audit_foundation.sql.

begin;

create type public.volunteer_availability as enum (
  'available',
  'limited',
  'unavailable'
);

create table public.volunteer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  member_id uuid unique references public.members(id) on delete set null,
  geography_id uuid not null references public.geographies(id) on delete restrict,
  org_unit_id uuid not null references public.organization_units(id) on delete restrict,
  full_name text not null,
  mobile text not null,
  profession text,
  education text,
  languages text[] not null default '{}'::text[],
  skills text[] not null default '{}'::text[],
  availability public.volunteer_availability not null default 'available',
  availability_notes text,
  preferred_duties text[] not null default '{}'::text[],
  vehicle_available boolean not null default false,
  driving_available boolean not null default false,
  medical_skills boolean not null default false,
  social_media_skills boolean not null default false,
  it_skills boolean not null default false,
  crowd_management boolean not null default false,
  logistics boolean not null default false,
  security_discipline boolean not null default false,
  address text,
  emergency_contact_name text,
  emergency_contact_mobile text,
  bio text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_profiles_full_name_check check (length(trim(full_name)) between 2 and 120),
  constraint volunteer_profiles_mobile_check check (mobile ~ '^\\+92[0-9]{10}$'),
  constraint volunteer_profiles_profession_check check (profession is null or length(profession) <= 160),
  constraint volunteer_profiles_education_check check (education is null or length(education) <= 300),
  constraint volunteer_profiles_availability_notes_check check (availability_notes is null or length(availability_notes) <= 500),
  constraint volunteer_profiles_address_check check (address is null or length(address) <= 2000),
  constraint volunteer_profiles_emergency_name_check check (emergency_contact_name is null or length(emergency_contact_name) <= 120),
  constraint volunteer_profiles_emergency_mobile_check check (emergency_contact_mobile is null or emergency_contact_mobile ~ '^\\+92[0-9]{10}$'),
  constraint volunteer_profiles_bio_check check (bio is null or length(bio) <= 2000),
  constraint volunteer_profiles_languages_count_check check (cardinality(languages) <= 12),
  constraint volunteer_profiles_skills_count_check check (cardinality(skills) <= 24),
  constraint volunteer_profiles_preferred_duties_count_check check (cardinality(preferred_duties) <= 16)
);

create index volunteer_profiles_scope_idx on public.volunteer_profiles(org_unit_id, is_active);
create index volunteer_profiles_geography_idx on public.volunteer_profiles(geography_id);
create index volunteer_profiles_availability_idx on public.volunteer_profiles(availability, is_active);
create index volunteer_profiles_name_idx on public.volunteer_profiles(lower(full_name));
create index volunteer_profiles_skills_gin_idx on public.volunteer_profiles using gin(skills);
create index volunteer_profiles_languages_gin_idx on public.volunteer_profiles using gin(languages);
create index volunteer_profiles_preferred_duties_gin_idx on public.volunteer_profiles using gin(preferred_duties);

create or replace function app_private.validate_volunteer_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.member_id is not null and not exists (
    select 1 from public.members m
    where m.id = new.member_id and m.user_id = new.user_id
  ) then
    raise exception 'Volunteer member link must belong to the same user';
  end if;

  if not exists (
    select 1
    from public.geographies g
    join public.organization_units ou on ou.geography_id = g.id
    where g.id = new.geography_id
      and g.kind = 'tehsil'::public.geography_kind
      and g.is_active
      and ou.id = new.org_unit_id
      and ou.level = 'tehsil'::public.organization_level
      and ou.is_active
  ) then
    raise exception 'Volunteer geography and organization scope do not match an active Tehsil / Taluka';
  end if;
  return new;
end;
$$;

revoke all on function app_private.validate_volunteer_scope() from public, anon, authenticated;

create trigger volunteer_profiles_validate_scope
before insert or update of geography_id, org_unit_id on public.volunteer_profiles
for each row execute function app_private.validate_volunteer_scope();

create trigger volunteer_profiles_set_updated_at
before update on public.volunteer_profiles
for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Scope-aware permission helpers
-- -----------------------------------------------------------------------------

create or replace function app_private.can_view_volunteers(
  p_user_id uuid,
  p_target_org_unit uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_legacy_admin(p_user_id)
    or exists (
      select 1
      from public.organization_role_assignments ra
      join public.organization_units scope_unit on scope_unit.id = ra.org_unit_id
      where ra.user_id = p_user_id
        and ra.is_active
        and scope_unit.is_active
        and ra.role in (
          'super_admin'::public.organization_role,
          'central_leadership'::public.organization_role,
          'national_operations_admin'::public.organization_role,
          'provincial_coordinator'::public.organization_role,
          'divisional_coordinator'::public.organization_role,
          'district_coordinator'::public.organization_role,
          'tehsil_coordinator'::public.organization_role,
          'supervisor'::public.organization_role,
          'auditor'::public.organization_role
        )
        and app_private.is_org_descendant(p_target_org_unit, ra.org_unit_id)
    );
$$;

create or replace function app_private.can_manage_volunteers(
  p_user_id uuid,
  p_target_org_unit uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_legacy_admin(p_user_id)
    or exists (
      select 1
      from public.organization_role_assignments ra
      join public.organization_units scope_unit on scope_unit.id = ra.org_unit_id
      where ra.user_id = p_user_id
        and ra.is_active
        and scope_unit.is_active
        and ra.role in (
          'super_admin'::public.organization_role,
          'national_operations_admin'::public.organization_role,
          'provincial_coordinator'::public.organization_role,
          'divisional_coordinator'::public.organization_role,
          'district_coordinator'::public.organization_role,
          'tehsil_coordinator'::public.organization_role,
          'supervisor'::public.organization_role
        )
        and app_private.is_org_descendant(p_target_org_unit, ra.org_unit_id)
    );
$$;

revoke all on function app_private.can_view_volunteers(uuid,uuid) from public, anon, authenticated;
revoke all on function app_private.can_manage_volunteers(uuid,uuid) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Validation helpers
-- -----------------------------------------------------------------------------

create or replace function app_private.clean_text_array(
  p_value jsonb,
  p_max_items integer,
  p_max_item_length integer
)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  result text[] := '{}'::text[];
  item text;
begin
  if p_value is null or p_value = 'null'::jsonb then
    return result;
  end if;

  if jsonb_typeof(p_value) <> 'array' then
    raise exception 'Expected an array';
  end if;

  if jsonb_array_length(p_value) > p_max_items then
    raise exception 'Too many list items';
  end if;

  for item in select trim(t.value) from jsonb_array_elements_text(p_value) as t(value) loop
    if item <> '' then
      if length(item) > p_max_item_length then
        raise exception 'List item is too long';
      end if;
      if not (item = any(result)) then
        result := array_append(result, item);
      end if;
    end if;
  end loop;

  return result;
end;
$$;

revoke all on function app_private.clean_text_array(jsonb,integer,integer) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Volunteer self-service RPC
-- -----------------------------------------------------------------------------

create or replace function public.save_my_volunteer_profile(
  p_geography_id uuid,
  p_profile jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_org_unit uuid;
  target_kind public.geography_kind;
  linked_member uuid;
  existing_row public.volunteer_profiles;
  result_id uuid;
  clean_name text := trim(coalesce(p_profile->>'full_name', ''));
  clean_mobile text := trim(coalesce(p_profile->>'mobile', ''));
  clean_profession text := nullif(trim(coalesce(p_profile->>'profession', '')), '');
  clean_education text := nullif(trim(coalesce(p_profile->>'education', '')), '');
  clean_availability public.volunteer_availability;
  clean_availability_notes text := nullif(trim(coalesce(p_profile->>'availability_notes', '')), '');
  clean_address text := nullif(trim(coalesce(p_profile->>'address', '')), '');
  clean_emergency_name text := nullif(trim(coalesce(p_profile->>'emergency_contact_name', '')), '');
  clean_emergency_mobile text := nullif(trim(coalesce(p_profile->>'emergency_contact_mobile', '')), '');
  clean_bio text := nullif(trim(coalesce(p_profile->>'bio', '')), '');
  clean_languages text[];
  clean_skills text[];
  clean_preferred_duties text[];
  was_existing boolean := false;
begin
  if actor is null then
    raise exception 'Authentication required';
  end if;

  if p_profile is null or jsonb_typeof(p_profile) <> 'object' or octet_length(p_profile::text) > 16000 then
    raise exception 'Invalid volunteer profile';
  end if;

  if exists (
    select 1 from jsonb_object_keys(p_profile) key
    where key not in (
      'full_name', 'mobile', 'profession', 'education', 'languages', 'skills',
      'availability', 'availability_notes', 'preferred_duties', 'vehicle_available',
      'driving_available', 'medical_skills', 'social_media_skills', 'it_skills',
      'crowd_management', 'logistics', 'security_discipline', 'address',
      'emergency_contact_name', 'emergency_contact_mobile', 'bio'
    )
  ) then
    raise exception 'Unsupported volunteer profile field';
  end if;

  if length(clean_name) not between 2 and 120 then
    raise exception 'Full name is required';
  end if;

  if clean_mobile !~ '^\\+92[0-9]{10}$' then
    raise exception 'Enter a valid Pakistani mobile number';
  end if;

  if clean_profession is not null and length(clean_profession) > 160 then
    raise exception 'Profession is too long';
  end if;
  if clean_education is not null and length(clean_education) > 300 then
    raise exception 'Education is too long';
  end if;
  if clean_availability_notes is not null and length(clean_availability_notes) > 500 then
    raise exception 'Availability notes are too long';
  end if;
  if clean_address is not null and length(clean_address) > 2000 then
    raise exception 'Address is too long';
  end if;
  if clean_emergency_name is not null and length(clean_emergency_name) > 120 then
    raise exception 'Emergency contact name is too long';
  end if;
  if clean_emergency_mobile is not null and clean_emergency_mobile !~ '^\\+92[0-9]{10}$' then
    raise exception 'Emergency mobile is invalid';
  end if;
  if clean_bio is not null and length(clean_bio) > 2000 then
    raise exception 'Volunteer bio is too long';
  end if;

  begin
    clean_availability := coalesce(nullif(p_profile->>'availability', ''), 'available')::public.volunteer_availability;
  exception when invalid_text_representation then
    raise exception 'Invalid availability';
  end;

  clean_languages := app_private.clean_text_array(p_profile->'languages', 12, 60);
  clean_skills := app_private.clean_text_array(p_profile->'skills', 24, 80);
  clean_preferred_duties := app_private.clean_text_array(p_profile->'preferred_duties', 16, 100);

  select g.kind, ou.id
  into target_kind, target_org_unit
  from public.geographies g
  join public.organization_units ou on ou.geography_id = g.id
  where g.id = p_geography_id
    and g.is_active
    and ou.is_active
    and ou.level = 'tehsil'::public.organization_level;

  if target_kind is distinct from 'tehsil'::public.geography_kind or target_org_unit is null then
    raise exception 'Select an active Tehsil / Taluka';
  end if;

  select m.id into linked_member
  from public.members m
  where m.user_id = actor
  limit 1;

  select * into existing_row
  from public.volunteer_profiles vp
  where vp.user_id = actor
  for update;

  was_existing := found;

  insert into public.volunteer_profiles(
    user_id,
    member_id,
    geography_id,
    org_unit_id,
    full_name,
    mobile,
    profession,
    education,
    languages,
    skills,
    availability,
    availability_notes,
    preferred_duties,
    vehicle_available,
    driving_available,
    medical_skills,
    social_media_skills,
    it_skills,
    crowd_management,
    logistics,
    security_discipline,
    address,
    emergency_contact_name,
    emergency_contact_mobile,
    bio,
    is_active
  ) values (
    actor,
    linked_member,
    p_geography_id,
    target_org_unit,
    clean_name,
    clean_mobile,
    clean_profession,
    clean_education,
    clean_languages,
    clean_skills,
    clean_availability,
    clean_availability_notes,
    clean_preferred_duties,
    coalesce((p_profile->>'vehicle_available')::boolean, false),
    coalesce((p_profile->>'driving_available')::boolean, false),
    coalesce((p_profile->>'medical_skills')::boolean, false),
    coalesce((p_profile->>'social_media_skills')::boolean, false),
    coalesce((p_profile->>'it_skills')::boolean, false),
    coalesce((p_profile->>'crowd_management')::boolean, false),
    coalesce((p_profile->>'logistics')::boolean, false),
    coalesce((p_profile->>'security_discipline')::boolean, false),
    clean_address,
    clean_emergency_name,
    clean_emergency_mobile,
    clean_bio,
    coalesce(existing_row.is_active, true)
  )
  on conflict(user_id) do update set
    member_id = excluded.member_id,
    geography_id = excluded.geography_id,
    org_unit_id = excluded.org_unit_id,
    full_name = excluded.full_name,
    mobile = excluded.mobile,
    profession = excluded.profession,
    education = excluded.education,
    languages = excluded.languages,
    skills = excluded.skills,
    availability = excluded.availability,
    availability_notes = excluded.availability_notes,
    preferred_duties = excluded.preferred_duties,
    vehicle_available = excluded.vehicle_available,
    driving_available = excluded.driving_available,
    medical_skills = excluded.medical_skills,
    social_media_skills = excluded.social_media_skills,
    it_skills = excluded.it_skills,
    crowd_management = excluded.crowd_management,
    logistics = excluded.logistics,
    security_discipline = excluded.security_discipline,
    address = excluded.address,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_mobile = excluded.emergency_contact_mobile,
    bio = excluded.bio,
    is_active = public.volunteer_profiles.is_active
  returning id into result_id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values(
    actor,
    case when was_existing then 'volunteer_profile_updated' else 'volunteer_profile_created' end,
    'volunteer_profile',
    result_id,
    target_org_unit,
    jsonb_build_object(
      'member_linked', linked_member is not null,
      'availability', clean_availability,
      'skills_count', cardinality(clean_skills),
      'preferred_duties_count', cardinality(clean_preferred_duties)
    )
  );

  return result_id;
end;
$$;

-- Coordinators receive a privacy-minimized operational directory instead of
-- direct access to full self-service profile rows (address/emergency contact/bio).
create or replace function public.list_volunteers_for_my_scope()
returns table(
  id uuid,
  full_name text,
  mobile text,
  profession text,
  education text,
  languages text[],
  skills text[],
  availability public.volunteer_availability,
  availability_notes text,
  preferred_duties text[],
  vehicle_available boolean,
  driving_available boolean,
  medical_skills boolean,
  social_media_skills boolean,
  it_skills boolean,
  crowd_management boolean,
  logistics boolean,
  security_discipline boolean,
  geography_id uuid,
  org_unit_id uuid,
  member_linked boolean,
  is_active boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    vp.id,
    vp.full_name,
    vp.mobile,
    vp.profession,
    vp.education,
    vp.languages,
    vp.skills,
    vp.availability,
    vp.availability_notes,
    vp.preferred_duties,
    vp.vehicle_available,
    vp.driving_available,
    vp.medical_skills,
    vp.social_media_skills,
    vp.it_skills,
    vp.crowd_management,
    vp.logistics,
    vp.security_discipline,
    vp.geography_id,
    vp.org_unit_id,
    vp.member_id is not null as member_linked,
    vp.is_active,
    vp.updated_at
  from public.volunteer_profiles vp
  where app_private.can_view_volunteers(auth.uid(), vp.org_unit_id)
  order by vp.updated_at desc;
$$;

-- Coordinators can deactivate/reactivate volunteers in their scope. Self-service
-- edits never change this administrative state.
create or replace function public.set_volunteer_active(
  p_volunteer_id uuid,
  p_is_active boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.volunteer_profiles;
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if clean_reason is not null and length(clean_reason) > 500 then
    raise exception 'Reason is too long';
  end if;

  select * into current_row
  from public.volunteer_profiles
  where id = p_volunteer_id
  for update;

  if not found then
    raise exception 'Volunteer not found';
  end if;

  if not app_private.can_manage_volunteers(auth.uid(), current_row.org_unit_id) then
    raise exception 'Volunteer management access required';
  end if;

  update public.volunteer_profiles
  set is_active = p_is_active
  where id = p_volunteer_id;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
  values(
    auth.uid(),
    case when p_is_active then 'volunteer_reactivated' else 'volunteer_deactivated' end,
    'volunteer_profile',
    p_volunteer_id,
    current_row.org_unit_id,
    jsonb_build_object('reason', clean_reason)
  );
end;
$$;

-- Lightweight access probe for coordinator/leadership UI guards.
create or replace function public.my_volunteer_workbench_access()
returns table(can_view boolean, can_manage boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_legacy_admin(auth.uid())
    or exists (
      select 1 from public.organization_role_assignments ra
      where ra.user_id = auth.uid()
        and ra.is_active
        and ra.role in (
          'super_admin'::public.organization_role,
          'central_leadership'::public.organization_role,
          'national_operations_admin'::public.organization_role,
          'provincial_coordinator'::public.organization_role,
          'divisional_coordinator'::public.organization_role,
          'district_coordinator'::public.organization_role,
          'tehsil_coordinator'::public.organization_role,
          'supervisor'::public.organization_role,
          'auditor'::public.organization_role
        )
    ) as can_view,
    app_private.is_legacy_admin(auth.uid())
    or exists (
      select 1 from public.organization_role_assignments ra
      where ra.user_id = auth.uid()
        and ra.is_active
        and ra.role in (
          'super_admin'::public.organization_role,
          'national_operations_admin'::public.organization_role,
          'provincial_coordinator'::public.organization_role,
          'divisional_coordinator'::public.organization_role,
          'district_coordinator'::public.organization_role,
          'tehsil_coordinator'::public.organization_role,
          'supervisor'::public.organization_role
        )
    ) as can_manage;
$$;

revoke all on function public.save_my_volunteer_profile(uuid,jsonb) from public, anon;
revoke all on function public.list_volunteers_for_my_scope() from public, anon;
revoke all on function public.set_volunteer_active(uuid,boolean,text) from public, anon;
revoke all on function public.my_volunteer_workbench_access() from public, anon;

grant execute on function public.save_my_volunteer_profile(uuid,jsonb) to authenticated;
grant execute on function public.list_volunteers_for_my_scope() to authenticated;
grant execute on function public.set_volunteer_active(uuid,boolean,text) to authenticated;
grant execute on function public.my_volunteer_workbench_access() to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.volunteer_profiles enable row level security;

create policy volunteer_profiles_read_own
on public.volunteer_profiles
for select
to authenticated
using (user_id = auth.uid());

revoke all on public.volunteer_profiles from anon, authenticated;
grant select on public.volunteer_profiles to authenticated;

-- Seed audit event for migration observability.
insert into public.audit_events(actor_id, action, entity_type, entity_id, org_unit_id, detail)
select
  null,
  'volunteer_registry_enabled',
  'volunteer_registry',
  null,
  central.id,
  jsonb_build_object('phase', '2', 'self_registration', true, 'admin_approval', false)
from public.organization_units central
where central.level = 'central'::public.organization_level
limit 1;

commit;
