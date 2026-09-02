-- BBJF Admin Assigned Designation Fields
-- Purpose: Support JAS-style workflow where members do NOT enter official designation.
-- Admin assigns designation after approval and it appears on card + QR verification.
-- Safe to run multiple times.

begin;

alter table public.members
  add column if not exists designation text,
  add column if not exists designation_level text,
  add column if not exists designation_area text;

create index if not exists members_designation_idx
  on public.members(designation)
  where designation is not null;

create index if not exists members_designation_level_idx
  on public.members(designation_level)
  where designation_level is not null;

create index if not exists members_designation_area_idx
  on public.members(designation_area)
  where designation_area is not null;

comment on column public.members.designation is
  'Official membership card designation assigned by admin after approval.';

comment on column public.members.designation_level is
  'Designation scope level, for example UC, City, Taluka, District, Divisional or Provincial.';

comment on column public.members.designation_area is
  'Designation area or jurisdiction, for example City Kunri or District Umerkot.';

-- Protect official designation fields from normal member-side updates.
-- Admin users and service-role server actions are allowed.
create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  -- Server-side service role and authenticated admins may update review/card fields.
  if auth.role() = 'service_role'
    or app_private.has_role((select auth.uid()), 'admin')
  then
    return new;
  end if;

  -- Normal members must never change official review/card fields.
  if new.member_no is distinct from old.member_no
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.approved_at is distinct from old.approved_at
    or new.designation is distinct from old.designation
    or new.designation_level is distinct from old.designation_level
    or new.designation_area is distinct from old.designation_area
  then
    raise exception 'Review/card/designation fields can only be changed by admin actions.';
  end if;

  -- Allow a rejected application to be edited and resubmitted by the same user.
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

commit;
