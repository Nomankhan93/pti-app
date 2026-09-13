-- Adds organizational scope fields for office-bearer designations.
-- Example: Designation = Vice President, Level = District, Area = Umerkot.

alter table public.members
  add column if not exists designation_level text,
  add column if not exists designation_area text;

create index if not exists members_designation_level_idx
  on public.members(designation_level)
  where designation_level is not null;

create index if not exists members_designation_area_idx
  on public.members(designation_area)
  where designation_area is not null;
