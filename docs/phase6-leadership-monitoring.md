# Phase 6 — Leadership Monitoring

Phase 6 adds aggregate, hierarchy-aware reporting for PTI leadership without exposing member, volunteer or donor PII.

## Dashboard hierarchy

The leadership dashboard supports Central → Province/Territory → Division → District → Tehsil/Taluka drill-down. Authorization follows active organization role assignments. Legacy admins receive Central scope; coordinators and auditors see only the subtree rooted at their assigned organization unit.

## KPI domains

The dashboard combines active/new membership, active/available volunteers, operation creation/completion, duty completion, attendance/participation, active fundraising campaigns and currency-safe finance totals. Finance currencies are reported independently rather than added together.

## Canonical membership geography

Historical membership rows stored district/taluka display text. Phase 6 adds `members.geography_id` and `members.org_unit_id`, safely backfills rows that have exactly one canonical match, and leaves ambiguous legacy rows unmapped rather than guessing. New registrations submit the selected canonical Tehsil geography ID. The old Sindh-only district CHECK is removed because the portal now supports Pakistan-wide registration.

## Reporting security

Public leadership RPCs are `SECURITY INVOKER` wrappers. Aggregate implementations are in `app_private`, run as `SECURITY DEFINER` with an empty `search_path`, and enforce organization-scope authorization before reading data. The dashboard returns aggregate operational and financial information only; it does not return member, volunteer or donor PII.

## Performance

`organization_unit_closure` stores ancestor/descendant relationships for fast hierarchical joins. It is not directly readable by `anon` or `authenticated` roles and is refreshed when organization parent relationships change.
