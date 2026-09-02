-- BBJF Membership Payment Rs. 500 Re-enable
-- Re-introduces the JAS-style manual membership payment workflow for BBJF.
-- Scope: applicant receipt upload, private receipt storage, admin verification,
-- and Rs. 500 fixed membership fee records.

begin;

create extension if not exists "pgcrypto";

-- Payment enums remain compatible with the earlier JAS/BBJF payment work.
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
  base_amount numeric(12,2) not null default 500,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 500,
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

alter table public.membership_payments
  add column if not exists receipt_path text,
  add column if not exists receipt_file_name text,
  add column if not exists receipt_mime_type text,
  add column if not exists receipt_size_bytes bigint,
  add column if not exists receipt_uploaded_at timestamptz,
  add column if not exists admin_note text,
  add column if not exists paid_at timestamptz;

alter table public.membership_payments
  alter column base_amount set default 500,
  alter column tax_amount set default 0,
  alter column total_amount set default 500,
  alter column currency set default 'PKR',
  alter column payment_method set default 'bank';

-- Normalize pending/retry rows to the BBJF Rs. 500 fee. Final paid/waived rows
-- are preserved except where they were zero/legacy placeholders.
update public.membership_payments
set
  base_amount = 500,
  tax_amount = 0,
  total_amount = 500,
  currency = 'PKR',
  payment_method = 'bank',
  gateway_provider = coalesce(gateway_provider, 'manual_mobilink_microfinance_bank'),
  updated_at = now()
where status in ('pending', 'failed', 'cancelled')
  and (
    base_amount is distinct from 500
    or tax_amount is distinct from 0
    or total_amount is distinct from 500
    or currency is distinct from 'PKR'
    or payment_method is distinct from 'bank'
  );

update public.membership_payments
set
  base_amount = 500,
  tax_amount = 0,
  total_amount = 500,
  currency = 'PKR',
  payment_method = 'bank',
  gateway_provider = coalesce(gateway_provider, 'manual_mobilink_microfinance_bank'),
  updated_at = now()
where status in ('paid', 'waived')
  and base_amount = 0
  and tax_amount = 0
  and total_amount = 0;

create index if not exists membership_payments_user_id_idx
  on public.membership_payments(user_id);

create index if not exists membership_payments_status_idx
  on public.membership_payments(status);

create index if not exists membership_payments_receipt_path_idx
  on public.membership_payments(receipt_path)
  where receipt_path is not null;

-- Keep updated_at current. app_private.set_updated_at already exists in the
-- original schema; this trigger name matches the earlier BBJF migration.
drop trigger if exists membership_payments_set_updated_at on public.membership_payments;
create trigger membership_payments_set_updated_at
before update on public.membership_payments
for each row
execute function app_private.set_updated_at();

alter table public.membership_payments enable row level security;

-- Re-enable authenticated access revoked by the payment-cleanup migration.
revoke select, insert, update, delete on public.membership_payments from anon;
grant select, insert, update on public.membership_payments to authenticated;

-- Table RLS: applicants can manage only their own pending receipt record;
-- admins can review/update payment status and notes.
drop policy if exists membership_payments_select_own_or_admin on public.membership_payments;
drop policy if exists membership_payments_select_own on public.membership_payments;
drop policy if exists membership_payments_select_membership_admin on public.membership_payments;
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
  and status = 'pending'
  and base_amount = 500
  and tax_amount = 0
  and total_amount = 500
  and currency = 'PKR'
  and payment_method = 'bank'
  and receipt_path is not null
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
  and status in ('pending', 'failed')
)
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and base_amount = 500
  and tax_amount = 0
  and total_amount = 500
  and currency = 'PKR'
  and payment_method = 'bank'
  and receipt_path is not null
);

drop policy if exists membership_payments_update_admin on public.membership_payments;
drop policy if exists membership_payments_update_membership_admin on public.membership_payments;
create policy membership_payments_update_admin
on public.membership_payments
for update
to authenticated
using (app_private.has_role((select auth.uid()), 'admin'))
with check (app_private.has_role((select auth.uid()), 'admin'));

drop policy if exists membership_payments_insert_membership_admin on public.membership_payments;
create policy membership_payments_insert_membership_admin
on public.membership_payments
for insert
to authenticated
with check (app_private.has_role((select auth.uid()), 'admin'));

-- Private receipt storage bucket. Path convention:
-- membership-receipts/{user_id}/receipt-{timestamp}.ext
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
drop policy if exists "membership_receipts_select_own_or_membership_admin" on storage.objects;
create policy membership_receipts_select_own_or_admin
on storage.objects
for select
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or owner = (select auth.uid())
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

drop policy if exists membership_receipts_insert_own_folder on storage.objects;
drop policy if exists "membership_receipts_insert_own" on storage.objects;
create policy membership_receipts_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'membership-receipts'
  and (
    ((storage.foldername(name))[1] = (select auth.uid())::text and owner = (select auth.uid()))
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

drop policy if exists membership_receipts_update_own_folder on storage.objects;
drop policy if exists "membership_receipts_update_own_or_membership_admin" on storage.objects;
create policy membership_receipts_update_own_or_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    ((storage.foldername(name))[1] = (select auth.uid())::text and owner = (select auth.uid()))
    or app_private.has_role((select auth.uid()), 'admin')
  )
)
with check (
  bucket_id = 'membership-receipts'
  and (
    ((storage.foldername(name))[1] = (select auth.uid())::text and owner = (select auth.uid()))
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

drop policy if exists membership_receipts_delete_own_or_admin on storage.objects;
drop policy if exists "membership_receipts_delete_own_or_membership_admin" on storage.objects;
create policy membership_receipts_delete_own_or_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'membership-receipts'
  and (
    ((storage.foldername(name))[1] = (select auth.uid())::text and owner = (select auth.uid()))
    or app_private.has_role((select auth.uid()), 'admin')
  )
);

comment on table public.membership_payments is
  'BBJF dedicated Rs. 500 membership application fee/payment records using manual Mobilink Microfinance Bank / JazzCash Raast receipt verification. Do not mix voluntary donations here.';

comment on column public.membership_payments.receipt_path is
  'Private storage path in membership-receipts bucket for manual BBJF membership fee receipt.';

commit;
