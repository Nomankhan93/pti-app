-- Add an optional designation/role field to membership profiles.
-- This keeps BBJF as a membership portal only; no organization-management module is added.

alter table public.members
  add column if not exists designation text;

create index if not exists members_designation_idx
on public.members(designation);
