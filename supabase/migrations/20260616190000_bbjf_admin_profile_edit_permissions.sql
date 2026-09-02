-- BBJF Admin Profile Edit Permissions
-- Purpose: Allow JAS-style admin profile corrections from /admin/members/:id.
-- Admin can edit member profile fields and upload replacement photos to member-photos/{member_user_id}/.
-- Safe to run multiple times.

begin;

-- Keep normal members blocked from changing review/card/designation fields,
-- while allowing authenticated admins to correct member profile data from the admin panel.
create or replace function app_private.protect_member_update()
returns trigger
language plpgsql
security definer
set search_path = app_private, public
as $$
begin
  -- Server-side service role and authenticated admins may update review/card/designation/profile fields.
  if auth.role() = 'service_role'
    or app_private.has_role((select auth.uid()), 'admin')
  then
    return new;
  end if;

  -- Normal members must never change official review/card/designation fields.
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

-- Existing policy usually allows only the owner to INSERT into their own folder.
-- Admin edit needs a safe insert policy for member replacement photos.
drop policy if exists "member_photos_insert_admin_any_member" on storage.objects;
create policy "member_photos_insert_admin_any_member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and app_private.has_role((select auth.uid()), 'admin')
  and exists (
    select 1
    from public.members m
    where m.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- Ensure admins can update replacement photo objects if the same path is reused later.
drop policy if exists "member_photos_update_admin_any_member" on storage.objects;
create policy "member_photos_update_admin_any_member"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'member-photos'
  and app_private.has_role((select auth.uid()), 'admin')
  and exists (
    select 1
    from public.members m
    where m.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
)
with check (
  bucket_id = 'member-photos'
  and app_private.has_role((select auth.uid()), 'admin')
  and exists (
    select 1
    from public.members m
    where m.user_id::text = (storage.foldername(storage.objects.name))[1]
  )
);

commit;
