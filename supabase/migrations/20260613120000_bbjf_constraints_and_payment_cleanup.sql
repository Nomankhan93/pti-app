-- BBJF Patch B: align database constraints with the live registration form
-- and disable deprecated manual payment objects after the payment UI was removed.

begin;

alter table public.members
  drop constraint if exists members_district_check,
  add constraint members_district_check
  check (
    district in (
      'Badin',
      'Dadu',
      'Ghotki',
      'Hyderabad',
      'Jacobabad',
      'Jamshoro',
      'Karachi Central',
      'Karachi East',
      'Keamari',
      'Karachi Keamari',
      'Korangi',
      'Karachi Korangi',
      'Malir',
      'Karachi Malir',
      'Karachi South',
      'Karachi West',
      'Kashmore',
      'Khairpur',
      'Larkana',
      'Matiari',
      'Mirpur Khas',
      'Naushahro Firoze',
      'Naushahro Feroze',
      'Qambar Shahdadkot',
      'Sanghar',
      'Shaheed Benazirabad',
      'Shikarpur',
      'Sukkur',
      'Sujawal',
      'Tando Allahyar',
      'Tando Muhammad Khan',
      'Tharparkar',
      'Thatta',
      'Umerkot'
    )
  );

alter table public.members
  drop constraint if exists members_gender_check,
  add constraint members_gender_check
  check (
    gender is null
    or gender in ('Male', 'Female', 'Other', 'Prefer not to say')
  );

-- Payment is intentionally disabled in the BBJF membership app.
-- Keep the legacy table/type only for safe historical compatibility, but revoke
-- normal authenticated access so new client code cannot use it accidentally.
do $$
begin
  if to_regclass('public.membership_payments') is not null then
    revoke select, insert, update, delete on public.membership_payments from authenticated;
    revoke select, insert, update, delete on public.membership_payments from anon;
  end if;
end $$;

commit;
