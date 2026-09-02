-- BBJF i18n register patch support
-- Adds complete profile fields, designation, manual membership payment records,
-- and receipt upload storage used by the multilingual registration form.

create extension if not exists "pgcrypto";

-- New member profile columns used by src/routes/register.tsx.
alter table public.members
  add column if not exists taluka text,
  add column if not exists address text,
  add column if not exists date_of_birth text,
  add column if not exists gender text,
  add column if not exists education text,
  add column if not exists blood_group text,
  add column if not exists designation text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relation text,
  add column if not exists emergency_contact_mobile text,
  add column if not exists declaration_accepted boolean not null default false;

-- Keep BBJF card numbers separate from JAS.
create or replace function public.approve_member(
  _member_id uuid,
  _reviewed_by uuid default null
)
returns public.members
language plpgsql
security definer
set search_path = app_private, public
as $$
declare
  current_year int;
  next_seq int;
  generated_no text;
  approved_member public.members;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only service role can approve members.';
  end if;

  if _reviewed_by is not null
    and not app_private.has_role(_reviewed_by, 'admin')
  then
    raise exception 'Reviewer must be an admin.';
  end if;

  if not exists (
    select 1
    from public.members
    where id = _member_id
      and status = 'pending'
  ) then
    raise exception 'Pending member application not found.';
  end if;

  current_year := extract(year from now())::int;

  insert into public.member_counters (year, last_seq)
  values (current_year, 1)
  on conflict (year)
  do update set last_seq = public.member_counters.last_seq + 1
  returning last_seq into next_seq;

  generated_no := 'BBJF-' || current_year || '-' || lpad(next_seq::text, 4, '0');

  update public.members
  set
    member_no = generated_no,
    status = 'approved',
    rejection_reason = null,
    reviewed_by = _reviewed_by,
    reviewed_at = now(),
    approved_at = now()
  where id = _member_id
    and status = 'pending'
  returning * into approved_member;

  return approved_member;
end;
$$;

-- Allow a rejected application to be edited and resubmitted by the same user.
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

  if new.member_no is distinct from old.member_no
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.approved_at is distinct from old.approved_at
  then
    raise exception 'Review/card fields can only be changed by server-side admin actions.';
  end if;

  if new.status is distinct from old.status then
    if not (old.status = 'rejected' and new.status = 'pending') then
      raise exception 'Only rejected applications can be resubmitted by the member.';
    end if;
  end if;

  if new.rejection_reason is distinct from old.rejection_reason then
    if not (old.status = 'rejected' and new.status = 'pending' and new.rejection_reason is null) then
      raise exception 'Rejection reason can only be cleared when resubmitting a rejected application.';
    end if;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Member ownership cannot be changed.';
  end if;

  return new;
end;
$$;

-- Expand member update policy to allow own pending edits and own rejected resubmission.
drop policy if exists "members_update_own_while_pending" on public.members;
create policy "members_update_own_pending_or_rejected"
on public.members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and status in ('pending', 'rejected')
)
with check (
  user_id = (select auth.uid())
  and status = 'pending'
);

-- Payment enums.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_payment_status') then
    create type public.membership_payment_status as enum (
      'pending', 'paid', 'failed', 'cancelled', 'refunded', 'waived'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_payment_method') then
    create type public.membership_payment_method as enum (
      'manual', 'jazzcash', 'easypaisa', 'bank', 'gateway'
    );
  end if;
end $$;

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'PKR',
  status public.membership_payment_status not null default 'pending',
  payment_method public.membership_payment_method not null default 'bank',
  gateway_provider text,
  gateway_reference text,
  receipt_path text,
  receipt_file_name text,
  receipt_mime_type text,
  receipt_size_bytes bigint,
  receipt_uploaded_at timestamptz,
  admin_note text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id)
);

create index if not exists membership_payments_user_id_idx
  on public.membership_payments(user_id);

create index if not exists membership_payments_status_idx
  on public.membership_payments(status);

create index if not exists membership_payments_receipt_path_idx
  on public.membership_payments(receipt_path)
  where receipt_path is not null;

drop trigger if exists membership_payments_set_updated_at on public.membership_payments;
create trigger membership_payments_set_updated_at
before update on public.membership_payments
for each row
execute function app_private.set_updated_at();

alter table public.membership_payments enable row level security;

drop policy if exists membership_payments_select_own_or_admin on public.membership_payments;
create policy membership_payments_select_own_or_admin
on public.membership_payments
for select
to authenticated
using (
  user_id = (select auth.uid())
  or app_private.has_role((select auth.uid()), 'admin')
);

drop policy if exists membership_payments_insert_own on public.membership_payments;
create policy membership_payments_insert_own
on public.membership_payments
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.members m
    where m.id = membership_payments.member_id
      and m.user_id = (select auth.uid())
      and m.status in ('pending', 'rejected')
  )
);

drop policy if exists membership_payments_update_own_pending_receipt on public.membership_payments;
create policy membership_payments_update_own_pending_receipt
on public.membership_payments
for update
to authenticated
using (
  user_id = (select auth.uid())
  and status = 'pending'
)
with check (
  user_id = (select auth.uid())
  and status = 'pending'
);

drop policy if exists membership_payments_update_admin on public.membership_payments;
create policy membership_payments_update_admin
on public.membership_payments
for update
to authenticated
using (app_private.has_role((select auth.uid()), 'admin'))
with check (app_private.has_role((select auth.uid()), 'admin'));

grant select, insert, update on public.membership_payments to authenticated;

-- Receipt storage bucket and owner-only access policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'membership-receipts',
  'membership-receipts',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists membership_receipts_select_own_or_admin on storage.objects;
create policy membership_receipts_select_own_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    owner = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

drop policy if exists membership_receipts_insert_own_folder on storage.objects;
create policy membership_receipts_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'membership-receipts'
  and owner = (select auth.uid())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists membership_receipts_update_own_folder on storage.objects;
create policy membership_receipts_update_own_folder
on storage.objects
for update
to authenticated
using (
  bucket_id = 'membership-receipts'
  and owner = (select auth.uid())
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'membership-receipts'
  and owner = (select auth.uid())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
