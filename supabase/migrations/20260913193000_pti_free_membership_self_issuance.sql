-- PTI Free Membership & Self-Issuance Cleanup
-- Canonical lifecycle after this migration:
--   auth account -> membership form -> automatic PTI member number -> active membership
-- No membership payment, receipt verification, admin approval, rejection, or resubmission gate.

begin;

-- -----------------------------------------------------------------------------
-- Canonical membership lifecycle fields
-- -----------------------------------------------------------------------------

alter table public.members
  add column if not exists issued_at timestamptz,
  add column if not exists is_active boolean;

-- Atomic PTI member-number allocation using the existing annual counter table.
create or replace function app_private.next_pti_member_no()
returns text
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  current_year int := extract(year from now())::int;
  next_seq int;
begin
  insert into public.member_counters (year, last_seq)
  values (current_year, 1)
  on conflict (year)
  do update set last_seq = public.member_counters.last_seq + 1
  returning last_seq into next_seq;

  return 'PTI-' || current_year || '-' || lpad(next_seq::text, 4, '0');
end;
$$;

revoke all on function app_private.next_pti_member_no() from public, anon, authenticated;

-- Preserve existing issued numbers; issue a PTI number only where one is missing.
do $$
declare
  row_record record;
begin
  for row_record in
    select id
    from public.members
    where member_no is null
    order by created_at, id
  loop
    update public.members
    set member_no = app_private.next_pti_member_no()
    where id = row_record.id;
  end loop;
end $$;

-- Preserve the best historical issuance timestamp before review columns disappear.
update public.members
set
  issued_at = coalesce(issued_at, approved_at, created_at, now()),
  is_active = true;

alter table public.members
  alter column issued_at set default now(),
  alter column issued_at set not null,
  alter column is_active set default true,
  alter column is_active set not null;

create index if not exists members_is_active_idx
  on public.members(is_active);

create index if not exists members_issued_at_idx
  on public.members(issued_at desc);

-- -----------------------------------------------------------------------------
-- Remove membership fee/payment runtime state
-- -----------------------------------------------------------------------------

-- The latest historical migration creates this table, so it exists in a normal
-- migration chain. Keep the cleanup idempotent enough for manually-cleaned DBs.
do $$
begin
  if to_regclass('public.membership_payments') is not null then
    execute 'drop table public.membership_payments cascade';
  end if;
end $$;

-- Remove private receipt storage policies and objects.
drop policy if exists membership_receipts_select_own_or_admin on storage.objects;
drop policy if exists "membership_receipts_select_own_or_membership_admin" on storage.objects;
drop policy if exists membership_receipts_insert_own_folder on storage.objects;
drop policy if exists "membership_receipts_insert_own" on storage.objects;
drop policy if exists membership_receipts_update_own_folder on storage.objects;
drop policy if exists membership_receipts_update_own_or_admin on storage.objects;
drop policy if exists "membership_receipts_update_own_or_membership_admin" on storage.objects;
drop policy if exists membership_receipts_delete_own_or_admin on storage.objects;
drop policy if exists "membership_receipts_delete_own_or_membership_admin" on storage.objects;

delete from storage.objects where bucket_id = 'membership-receipts';
delete from storage.buckets where id = 'membership-receipts';

drop type if exists public.membership_payment_status;
drop type if exists public.membership_payment_method;

-- -----------------------------------------------------------------------------
-- Remove admin approval/rejection lifecycle
-- -----------------------------------------------------------------------------

drop function if exists public.approve_member(uuid, uuid);
drop function if exists public.reject_member(uuid, text, uuid);

-- Remove review-state policies before dropping their referenced columns.
drop policy if exists "members_insert_own_pending" on public.members;
drop policy if exists "members_update_own_while_pending" on public.members;
drop policy if exists "members_update_own_pending_or_rejected" on public.members;
drop policy if exists "members_update_own_or_admin" on public.members;
drop policy if exists "members_admin_select_update_all" on public.members;
drop policy if exists "members_insert_own_self_issued" on public.members;

-- Browser clients may edit profile data but never membership system fields.
create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Member ownership cannot be changed.';
  end if;

  if new.member_no is distinct from old.member_no
    or new.issued_at is distinct from old.issued_at
    or new.is_active is distinct from old.is_active
  then
    raise exception 'Membership issuance and activation fields are server managed.';
  end if;

  return new;
end;
$$;

-- Automatic self-issuance. Values are forced server-side even if a client tries
-- to supply its own member number or activation state.
create or replace function app_private.self_issue_member()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  new.member_no := app_private.next_pti_member_no();
  new.issued_at := now();
  new.is_active := true;
  return new;
end;
$$;

drop trigger if exists members_self_issue on public.members;
create trigger members_self_issue
before insert on public.members
for each row
execute function app_private.self_issue_member();

create policy "members_insert_own_self_issued"
on public.members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and member_no is not null
  and issued_at is not null
  and is_active = true
);

create policy "members_update_own_or_admin"
on public.members
for update
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.has_role((select auth.uid()), 'admin')
)
with check (
  user_id = (select auth.uid())
  or app_private.has_role((select auth.uid()), 'admin')
);

-- Canonical schema no longer carries review/approval columns or enum.
drop index if exists public.members_status_idx;

alter table public.members
  drop column if exists rejection_reason,
  drop column if exists reviewed_by,
  drop column if exists reviewed_at,
  drop column if exists approved_at,
  drop column if exists status;

drop type if exists public.member_status;

comment on column public.members.issued_at is
  'Automatic PTI membership issue timestamp. Registration is self-issued and requires no admin approval.';
comment on column public.members.is_active is
  'Administrative activation flag. New registrations are active by default; service-role admin actions may deactivate/reactivate.';

commit;
