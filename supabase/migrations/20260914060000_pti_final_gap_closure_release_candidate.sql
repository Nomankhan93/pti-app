-- PTI Final Gap Closure & Release Candidate Hardening
-- Release-candidate forward migration.
-- Closes membership privilege escalation/photo ownership/public verification gaps,
-- unifies legacy-admin + super-admin membership authority, adds auditable member
-- exports, and enforces finance maker/checker separation.

begin;

-- -----------------------------------------------------------------------------
-- Membership authority: one canonical helper for legacy admin + active super admin
-- -----------------------------------------------------------------------------

create or replace function app_private.can_manage_membership_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id is not null
    and (
      app_private.is_legacy_admin(p_user_id)
      or exists (
        select 1
        from public.organization_role_assignments ra
        join public.organization_units ou on ou.id = ra.org_unit_id
        where ra.user_id = p_user_id
          and ra.is_active
          and ra.role = 'super_admin'::public.organization_role
          and ou.is_active
      )
    );
$$;

revoke all on function app_private.can_manage_membership_admin(uuid) from public, anon, authenticated;
grant execute on function app_private.can_manage_membership_admin(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Membership integrity + privacy fields
-- -----------------------------------------------------------------------------

alter table public.members
  add column if not exists public_verify_token text,
  add column if not exists declaration_accepted_at timestamptz,
  add column if not exists declaration_version text;

update public.members
set public_verify_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where public_verify_token is null or length(public_verify_token) < 32;

update public.members
set declaration_accepted_at = coalesce(declaration_accepted_at, created_at),
    declaration_version = coalesce(nullif(declaration_version, ''), '2026-09-RC1')
where declaration_accepted = true;

alter table public.members
  alter column public_verify_token set not null,
  alter column public_verify_token set default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  alter column declaration_version set default '2026-09-RC1';

create unique index if not exists members_public_verify_token_uidx
  on public.members(public_verify_token);

comment on column public.members.public_verify_token is
  'High-entropy public verification reference. QR codes use this token instead of the predictable member number.';
comment on column public.members.declaration_accepted_at is
  'Server-managed timestamp recording acceptance of the membership declaration.';
comment on column public.members.declaration_version is
  'Server-managed declaration text/version accepted at registration.';

-- Existing rows can contain historical photo paths. Flag rather than rewrite them.
-- New member-side writes are strictly scoped to {user_id}/... below.

create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  expected_prefix text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if actor is not null and app_private.can_manage_membership_admin(actor) then
    return new;
  end if;

  if actor is null or old.user_id is distinct from actor then
    raise exception 'Member ownership required.';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Member ownership cannot be changed.';
  end if;

  if new.member_no is distinct from old.member_no
    or new.issued_at is distinct from old.issued_at
    or new.is_active is distinct from old.is_active
    or new.designation is distinct from old.designation
    or new.designation_level is distinct from old.designation_level
    or new.designation_area is distinct from old.designation_area
    or new.public_verify_token is distinct from old.public_verify_token
    or new.org_unit_id is distinct from old.org_unit_id
    or new.declaration_accepted_at is distinct from old.declaration_accepted_at
    or new.declaration_version is distinct from old.declaration_version
  then
    raise exception 'Membership issuance, authority and designation fields are server managed.';
  end if;

  if new.declaration_accepted is distinct from old.declaration_accepted
     or new.declaration_accepted is not true then
    raise exception 'Membership declaration acceptance cannot be removed or changed.';
  end if;

  if new.photo_url is distinct from old.photo_url then
    expected_prefix := old.user_id::text || '/';
    if new.photo_url is null
       or length(trim(new.photo_url)) = 0
       or left(new.photo_url, length(expected_prefix)) <> expected_prefix
    then
      raise exception 'Member photo must remain inside the member storage folder.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function app_private.self_issue_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  expected_prefix text;
begin
  if auth.role() <> 'service_role' then
    if actor is null or new.user_id is distinct from actor then
      raise exception 'Membership can only be created for the authenticated user.';
    end if;

    if new.declaration_accepted is not true then
      raise exception 'Membership declaration must be accepted.';
    end if;

    expected_prefix := new.user_id::text || '/';
    if new.photo_url is null
       or length(trim(new.photo_url)) = 0
       or left(new.photo_url, length(expected_prefix)) <> expected_prefix
    then
      raise exception 'Member photo must be uploaded inside your member storage folder.';
    end if;
  end if;

  -- Never accept client-supplied authority fields during self-registration.
  new.designation := null;
  new.designation_level := null;
  new.designation_area := null;
  new.member_no := app_private.next_pti_member_no();
  new.issued_at := now();
  new.is_active := true;
  new.public_verify_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  new.declaration_accepted := true;
  new.declaration_accepted_at := now();
  new.declaration_version := '2026-09-RC1';
  return new;
end;
$$;

-- Rebuild membership policies around the canonical helper.
drop policy if exists "members_select_own_or_admin" on public.members;
create policy "members_select_own_or_membership_admin"
on public.members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.can_manage_membership_admin((select auth.uid()))
);

drop policy if exists "members_update_own_or_admin" on public.members;
create policy "members_update_own_or_membership_admin"
on public.members
for update
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.can_manage_membership_admin((select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or app_private.can_manage_membership_admin((select auth.uid()))
);

drop policy if exists "members_insert_own_self_issued" on public.members;
create policy "members_insert_own_self_issued"
on public.members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and member_no is not null
  and issued_at is not null
  and is_active = true
  and declaration_accepted = true
  and declaration_accepted_at is not null
  and declaration_version is not null
  and designation is null
  and designation_level is null
  and designation_area is null
  and public_verify_token is not null
);

-- Admin-only legacy policies now recognize super_admin too.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_membership_admin"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or app_private.can_manage_membership_admin((select auth.uid()))
);

drop policy if exists "user_roles_select_admin_only" on public.user_roles;
create policy "user_roles_select_membership_admin"
on public.user_roles
for select
to authenticated
using (app_private.can_manage_membership_admin((select auth.uid())));

drop policy if exists "member_counters_admin_select" on public.member_counters;
create policy "member_counters_membership_admin_select"
on public.member_counters
for select
to authenticated
using (app_private.can_manage_membership_admin((select auth.uid())));

-- Storage: own-folder access or canonical membership admin.
drop policy if exists "member_photos_select_own_or_admin" on storage.objects;
create policy "member_photos_select_own_or_membership_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.can_manage_membership_admin((select auth.uid()))
  )
);

drop policy if exists "member_photos_update_own_or_admin" on storage.objects;
create policy "member_photos_update_own_or_membership_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.can_manage_membership_admin((select auth.uid()))
  )
)
with check (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.can_manage_membership_admin((select auth.uid()))
  )
);

drop policy if exists "member_photos_delete_own_or_admin" on storage.objects;
create policy "member_photos_delete_own_or_membership_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'member-photos'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or app_private.can_manage_membership_admin((select auth.uid()))
  )
);

drop policy if exists "member_photos_insert_admin_any_member" on storage.objects;
create policy "member_photos_insert_membership_admin_any_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and app_private.can_manage_membership_admin((select auth.uid()))
  and exists (
    select 1 from public.members m
    where m.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
);

drop policy if exists "member_photos_update_admin_any_member" on storage.objects;
create policy "member_photos_update_membership_admin_any_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and app_private.can_manage_membership_admin((select auth.uid()))
  and exists (
    select 1 from public.members m
    where m.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  bucket_id = 'member-photos'
  and app_private.can_manage_membership_admin((select auth.uid()))
  and exists (
    select 1 from public.members m
    where m.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- -----------------------------------------------------------------------------
-- Public verification budget. Service-role server action is the only caller.
-- -----------------------------------------------------------------------------

create table if not exists app_private.public_verification_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hit_count integer not null,
  updated_at timestamptz not null default now(),
  constraint public_verification_hit_count_check check (hit_count > 0)
);

revoke all on app_private.public_verification_buckets from public, anon, authenticated;

create or replace function public.consume_public_verification_budget(p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(trim(coalesce(p_reference, '')));
  bucket text;
  next_count integer;
  window_start timestamptz;
  now_value timestamptz := now();
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.';
  end if;

  if length(normalized) < 24 or length(normalized) > 160 then
    raise exception 'Invalid verification reference.';
  end if;

  -- Per-reference budget prevents repeated probing of one QR token. A second
  -- shared circuit-breaker caps broad random-token enumeration against this
  -- single application project even when the attacker rotates references.
  bucket := md5(normalized);

  insert into app_private.public_verification_buckets(bucket_key, window_started_at, hit_count, updated_at)
  values('global:verify', now_value, 1, now_value)
  on conflict (bucket_key)
  do update set
    hit_count = case
      when app_private.public_verification_buckets.window_started_at <= now_value - interval '5 minutes' then 1
      else app_private.public_verification_buckets.hit_count + 1
    end,
    window_started_at = case
      when app_private.public_verification_buckets.window_started_at <= now_value - interval '5 minutes' then now_value
      else app_private.public_verification_buckets.window_started_at
    end,
    updated_at = now_value
  returning hit_count, window_started_at into next_count, window_start;

  if next_count > 1200 and window_start > now_value - interval '5 minutes' then
    raise exception 'Verification service is temporarily busy. Please try again later.';
  end if;

  insert into app_private.public_verification_buckets(bucket_key, window_started_at, hit_count, updated_at)
  values(bucket, now_value, 1, now_value)
  on conflict (bucket_key)
  do update set
    hit_count = case
      when app_private.public_verification_buckets.window_started_at <= now_value - interval '5 minutes' then 1
      else app_private.public_verification_buckets.hit_count + 1
    end,
    window_started_at = case
      when app_private.public_verification_buckets.window_started_at <= now_value - interval '5 minutes' then now_value
      else app_private.public_verification_buckets.window_started_at
    end,
    updated_at = now_value
  returning hit_count, window_started_at into next_count, window_start;

  if next_count > 40 and window_start > now_value - interval '5 minutes' then
    raise exception 'Verification request limit reached. Please try again later.';
  end if;

  delete from app_private.public_verification_buckets
  where updated_at < now_value - interval '2 days';
end;
$$;

revoke all on function public.consume_public_verification_budget(text) from public, anon, authenticated;
grant execute on function public.consume_public_verification_budget(text) to service_role;

-- -----------------------------------------------------------------------------
-- Finance maker/checker: recorder != verifier != reconciler for reconciled funds
-- -----------------------------------------------------------------------------

create or replace function app_private.set_donation_verification_impl(
  p_donation_id uuid,
  p_state public.donation_verification_state,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  donation_row public.donations;
  clean_note text := nullif(trim(coalesce(p_note,'')),'');
  previous_state public.donation_verification_state;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select * into donation_row from public.donations where id=p_donation_id;
  if not found then raise exception 'Donation not found'; end if;
  if not app_private.can_verify_finance(actor,donation_row.org_unit_id) then raise exception 'Donation verification access required'; end if;
  if donation_row.recorded_by = actor then raise exception 'Maker/checker control: the donation recorder cannot verify the same donation'; end if;
  if p_state not in ('verified'::public.donation_verification_state,'rejected'::public.donation_verification_state) then raise exception 'Verification state must be verified or rejected'; end if;
  if clean_note is not null and length(clean_note)>2000 then raise exception 'Verification note is too long'; end if;
  if p_state='rejected'::public.donation_verification_state and clean_note is null then raise exception 'A rejection reason is required'; end if;
  previous_state := app_private.latest_donation_verification_state(donation_row.id);
  insert into public.donation_verification_events(donation_id,state,note,actor_id) values(donation_row.id,p_state,clean_note,actor);
  if p_state='rejected'::public.donation_verification_state and app_private.latest_donation_reconciliation_state(donation_row.id)='reconciled'::public.donation_reconciliation_state then
    insert into public.donation_reconciliation_events(donation_id,state,note,actor_id)
    values(donation_row.id,'exception','Verification changed to rejected after reconciliation',actor);
  end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'finance_donation_verification_changed','donation',donation_row.id,donation_row.org_unit_id,jsonb_build_object('donation_no',donation_row.donation_no,'from',previous_state,'to',p_state,'maker_checker',true));
end;
$$;

create or replace function app_private.set_donation_reconciliation_impl(
  p_donation_id uuid,
  p_state public.donation_reconciliation_state,
  p_reference text default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  donation_row public.donations;
  clean_reference text := nullif(trim(coalesce(p_reference,'')),'');
  clean_note text := nullif(trim(coalesce(p_note,'')),'');
  previous_state public.donation_reconciliation_state;
  effective_amount numeric;
  verifier uuid;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select * into donation_row from public.donations where id=p_donation_id;
  if not found then raise exception 'Donation not found'; end if;
  if not app_private.can_reconcile_finance(actor,donation_row.org_unit_id) then raise exception 'Donation reconciliation access required'; end if;
  if donation_row.recorded_by = actor then raise exception 'Maker/checker control: the donation recorder cannot reconcile the same donation'; end if;
  if p_state not in ('reconciled'::public.donation_reconciliation_state,'exception'::public.donation_reconciliation_state) then raise exception 'Reconciliation state must be reconciled or exception'; end if;
  if clean_reference is not null and length(clean_reference)>240 then raise exception 'Reconciliation reference is too long'; end if;
  if clean_note is not null and length(clean_note)>2000 then raise exception 'Reconciliation note is too long'; end if;
  if p_state='reconciled'::public.donation_reconciliation_state then
    if app_private.latest_donation_verification_state(donation_row.id)<>'verified'::public.donation_verification_state then raise exception 'Donation must be verified before reconciliation'; end if;
    select e.actor_id into verifier
    from public.donation_verification_events e
    where e.donation_id = donation_row.id and e.state='verified'::public.donation_verification_state
    order by e.created_at desc, e.id desc
    limit 1;
    if verifier is null then raise exception 'Verified donation actor is missing'; end if;
    if verifier = actor then raise exception 'Maker/checker control: verifier and reconciler must be different users'; end if;
    if clean_reference is null then raise exception 'Reconciliation reference is required'; end if;
    effective_amount := app_private.effective_donation_amount(donation_row.id);
    if effective_amount is null or effective_amount<=0 then raise exception 'Donation has no positive amount to reconcile'; end if;
  elsif clean_note is null then
    raise exception 'Exception note is required';
  end if;
  previous_state := app_private.latest_donation_reconciliation_state(donation_row.id);
  insert into public.donation_reconciliation_events(donation_id,state,reconciliation_reference,note,actor_id)
  values(donation_row.id,p_state,clean_reference,clean_note,actor);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'finance_donation_reconciliation_changed','donation',donation_row.id,donation_row.org_unit_id,jsonb_build_object('donation_no',donation_row.donation_no,'from',previous_state,'to',p_state,'reference',clean_reference,'maker_checker',true));
end;
$$;

-- -----------------------------------------------------------------------------
-- Audited/rate-limited member exports, masked by default
-- -----------------------------------------------------------------------------

alter table public.production_export_audit
  drop constraint if exists production_export_kind_check;

alter table public.production_export_audit
  add constraint production_export_kind_check
  check (export_kind in ('audit_events','finance_ledger','members_masked','members_sensitive'));

create or replace function app_private.production_export_members_impl(
  p_include_sensitive boolean default false,
  p_reason text default null,
  p_limit integer default 5000
)
returns table(
  member_no text,
  full_name text,
  cnic text,
  mobile text,
  district text,
  taluka text,
  designation text,
  designation_level text,
  designation_area text,
  is_active boolean,
  issued_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  clean_reason text := nullif(trim(coalesce(p_reason,'')), '');
  safe_limit integer := least(greatest(coalesce(p_limit,5000),1),10000);
  exported integer;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if not app_private.can_manage_membership_admin(actor) then raise exception 'Membership admin access required'; end if;
  perform app_private.consume_rate_limit('production_export_members',10,300);

  if coalesce(p_include_sensitive,false) and (clean_reason is null or length(clean_reason) < 10) then
    raise exception 'A reason of at least 10 characters is required for sensitive member exports';
  end if;

  select count(*) into exported from (select 1 from public.members limit safe_limit) q;

  insert into public.production_export_audit(actor_id,export_kind,org_unit_id,row_count,filters)
  values(
    actor,
    case when coalesce(p_include_sensitive,false) then 'members_sensitive' else 'members_masked' end,
    null,
    exported,
    jsonb_build_object('sensitive',coalesce(p_include_sensitive,false),'reason',clean_reason,'limit',safe_limit)
  );

  insert into public.audit_events(actor_id,action,entity_type,entity_id,org_unit_id,detail)
  values(actor,'production_export_created','member_export',null,null,
    jsonb_build_object('sensitive',coalesce(p_include_sensitive,false),'reason',clean_reason,'row_count',exported));

  return query
  select
    m.member_no,
    m.full_name,
    case
      when coalesce(p_include_sensitive,false) then m.cnic
      when m.cnic is null then null
      else left(m.cnic,5) || '-*******-' || right(m.cnic,1)
    end,
    case
      when coalesce(p_include_sensitive,false) then m.mobile
      when m.mobile is null then null
      when length(m.mobile) >= 6 then left(m.mobile,4) || '*****' || right(m.mobile,2)
      else '***********'
    end,
    m.district,
    m.taluka,
    m.designation,
    m.designation_level,
    m.designation_area,
    m.is_active,
    m.issued_at,
    m.created_at
  from public.members m
  order by m.created_at desc
  limit safe_limit;
end;
$$;

revoke all on function app_private.production_export_members_impl(boolean,text,integer) from public, anon, authenticated;
grant execute on function app_private.production_export_members_impl(boolean,text,integer) to authenticated;

create or replace function public.production_export_members(
  p_include_sensitive boolean default false,
  p_reason text default null,
  p_limit integer default 5000
)
returns table(
  member_no text,
  full_name text,
  cnic text,
  mobile text,
  district text,
  taluka text,
  designation text,
  designation_level text,
  designation_area text,
  is_active boolean,
  issued_at timestamptz,
  created_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select * from app_private.production_export_members_impl(p_include_sensitive,p_reason,p_limit);
$$;

revoke all on function public.production_export_members(boolean,text,integer) from public, anon, authenticated;
grant execute on function public.production_export_members(boolean,text,integer) to authenticated;

commit;
