# PTI Database Security & Performance Stabilization

This note documents the stabilization applied after the Organization/RBAC, Volunteer, Operations, and Attendance phases.

## What this release fixes

- Rewrites the 13 RLS policies flagged by Supabase `auth_rls_initplan` so `auth.uid()` is initialized once per statement with `(select auth.uid())`.
- Fixes the geography RLS/helper permission mismatch that produced `permission denied for function can_manage_org_security`.
- Adds 19 simple indexes covering the foreign keys reported by the Supabase Performance Advisor.
- Keeps the 44 currently-unused indexes. The platform is still early and those indexes support expected membership, geography, volunteer, operations, attendance and audit query paths; removal should wait for meaningful production statistics.
- Pins an explicit allowlist for the 33 authenticated `SECURITY DEFINER` RPCs: anonymous access is revoked, authenticated execution is retained, and a fixed empty `search_path` is enforced.
- Hardens active legacy private SECURITY DEFINER helpers to an empty `search_path`.
- Adds database smoke checks for RLS helper privileges, optimized policy definitions, FK indexes, RPC ACL/search-path posture, and authorization-guard presence.

## Intentional Security Advisor warnings

The application uses authenticated `SECURITY DEFINER` RPCs as controlled mutation/read boundaries. Direct client table writes are restricted and each privileged mutator performs authorization/ownership checks inside the function.

Supabase may therefore continue to list `authenticated_security_definer_function_executable` warnings for the existing public RPCs. They are not blindly converted to `SECURITY INVOKER`, because doing that would break the scoped RPC boundary or require broader table privileges.

The long-term alternative, if a zero-warning advisor is desired, is to move privileged implementations into `app_private` and expose thin `SECURITY INVOKER` public wrappers. That is an architectural refactor and is intentionally not mixed into this stabilization migration.

For new finance/fundraising RPCs, prefer the private-implementation/public-wrapper pattern from the start so the finance domain does not add more exposed SECURITY DEFINER warnings.

## Supabase Auth setting still requires dashboard action

Leaked-password protection is an Auth project setting, not a normal SQL migration. Enable **Leaked Password Protection** in Supabase Auth settings before production.

## Expected advisor result after migration

After refreshing the Supabase advisors:

- `auth_rls_initplan`: expected to clear for the 13 reported policies.
- `unindexed_foreign_keys`: expected to clear for the 19 reported foreign keys.
- `unused_index`: may remain and is intentionally not addressed yet.
- `authenticated_security_definer_function_executable`: may remain for the 33 intentional RPCs; review against the allowlist and QA rather than automatically changing execution mode.
- `auth_leaked_password_protection`: remains until the Auth dashboard setting is enabled.

## Verification

Run:

```bash
npx supabase migration list
npx supabase db push
```

Then run the SQL in:

```text
supabase/qa/security-performance-stabilization-smoke.sql
```

Finally refresh both Supabase Performance Advisor and Security Advisor.
