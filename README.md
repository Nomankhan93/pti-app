# PTI Membership Portal

Pakistan Tehreek-e-Insaf (PTI) digital membership portal built with TanStack Start, React, TypeScript, Tailwind CSS, and Supabase.

## Scope

This app is a membership portal only. It includes:

- Member signup and login
- Membership registration form
- Free self-registration with automatic PTI member number issuance
- Member dashboard
- Digital membership card with QR verification
- Public verification page
- Admin member management

Membership is free and self-issued. There is no membership payment table, receipt workflow, or admin approval/rejection gate. Admins manage member profiles, designations, and active/inactive status.

## Tech Stack

- TanStack Start / TanStack Router
- React 19 + TypeScript
- Tailwind CSS
- Supabase Auth, Database, Storage, and RLS
- `html-to-image` for card export
- `qrcode` for QR generation

## Environment Variables

Create `.env.local` locally from `.env.example`:

```bash
cp .env.example .env.local
```

Required values:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

Never commit or share `.env.local`. If a ZIP containing `.env.local` was shared, rotate the Supabase service role key.

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run check
npm run build
npm run test
```

Full verification:

```bash
npm run verify:project
```

## Supabase Migrations

Run migrations locally with Supabase CLI, or apply them in Supabase Cloud SQL editor in order.

Important latest migration:

```txt
supabase/migrations/20260913193000_pti_free_membership_self_issuance.sql
```

It removes the runtime payment/review workflow, adds `issued_at` and `is_active`, self-issues PTI member numbers atomically at registration, removes approval/rejection RPCs, drops `membership_payments`, and removes the private membership receipt bucket. Earlier migrations remain part of immutable migration history.

## Admin Setup

Create a user through Supabase Auth, then grant the admin role:

```sql
insert into public.user_roles (user_id, role)
values ('AUTH_USER_UUID_HERE'::uuid, 'admin')
on conflict do nothing;
```

## Safe ZIP Export

Use this command when sharing the project:

```bash
npm run safe-export
```

It excludes secrets, local Supabase state, dependencies, build output, logs, and previous ZIP files.

To verify an exported ZIP:

```bash
bash scripts/check-safe-archive.sh exports/pti-app-safe-YYYYMMDD-HHMMSS.zip
```

## Key Routes

```txt
/                  Public home
/signup            Account registration
/login             Login
/register          Membership form
/dashboard         Member dashboard
/card              Digital card
/verify/$memberNo  Public QR verification
/admin             Admin members panel
/admin/members/$id Admin member detail
```
