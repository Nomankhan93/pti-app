-- Add membership-profile fields only. No program, finance, welfare, or operations modules.
-- These columns are nullable/defaulted so existing member records continue to work.

alter table public.members
  add column if not exists taluka text,
  add column if not exists address text,
  add column if not exists date_of_birth text,
  add column if not exists gender text,
  add column if not exists education text,
  add column if not exists blood_group text,
  add column if not exists declaration_accepted boolean not null default false;

create index if not exists members_taluka_idx
on public.members(taluka);

alter table public.members
  drop constraint if exists members_gender_check,
  add constraint members_gender_check
  check (
    gender is null
    or gender in ('Male', 'Female', 'Other')
  );

alter table public.members
  drop constraint if exists members_blood_group_check,
  add constraint members_blood_group_check
  check (
    blood_group is null
    or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  );
