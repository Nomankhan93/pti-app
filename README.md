# BBJF Membership Portal

Bilawal Bhutto Jayala Federation (BBJF) digital membership portal built with TanStack Start, React, TypeScript, Tailwind CSS, and Supabase.

## Scope

This app is a membership portal only. It includes:

- Member signup and login
- Membership registration form
- Admin approval/rejection workflow
- Member dashboard
- Digital membership card with QR verification
- Public verification page
- Admin member management

Payment collection is intentionally disabled in the BBJF app. Do not re-enable payment tables, receipt uploads, or payment UI unless BBJF explicitly approves a new payment workflow.

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
supabase/migrations/20260618150000_bbjf_membership_payment_rs500.sql
```

It re-enables the BBJF membership payment workflow with a fixed Rs. 500 fee, private receipt uploads, and admin payment verification policies. The earlier `20260613120000_bbjf_constraints_and_payment_cleanup.sql` migration is still part of history and should remain in order.

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
bash scripts/check-safe-archive.sh exports/bbjf-app-safe-YYYYMMDD-HHMMSS.zip
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
