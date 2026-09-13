-- PTI Organization, RBAC & Audit Foundation smoke checks.
-- Run after 20260913210000_pti_organization_rbac_audit_foundation.sql.

-- Expected reference counts from the supplied Pakistan geography file:
-- province/territory roots = 7
-- divisions = 40
-- districts = 170
-- tehsil/taluka records = 658
select kind, count(*) as total
from public.geographies
group by kind
order by kind;

-- Expected organization units = 876 (875 geography-backed + PTI Central).
select level, count(*) as total
from public.organization_units
group by level
order by level;

select count(*) as organization_unit_total
from public.organization_units;

-- Every non-central organization unit must have a parent and geography.
select id, code, level, parent_id, geography_id
from public.organization_units
where level <> 'central'
  and (parent_id is null or geography_id is null);

-- There must be exactly one central root.
select count(*) as central_roots
from public.organization_units
where level = 'central'
  and parent_id is null
  and geography_id is null;

-- Geography parent integrity: only ICT-like direct province -> district skips are allowed.
select child.code, child.kind, parent.code as parent_code, parent.kind as parent_kind
from public.geographies child
left join public.geographies parent on parent.id = child.parent_id
where
  (child.kind = 'province' and child.parent_id is not null)
  or (child.kind = 'division' and parent.kind is distinct from 'province')
  or (child.kind = 'district' and parent.kind not in ('province', 'division'))
  or (child.kind = 'tehsil' and parent.kind is distinct from 'district');

-- Existing legacy admins should have active central super-admin assignments.
select ur.user_id, ra.id as assignment_id, ou.code as scope_code
from public.user_roles ur
left join public.organization_role_assignments ra
  on ra.user_id = ur.user_id
 and ra.role = 'super_admin'
 and ra.is_active
left join public.organization_units ou on ou.id = ra.org_unit_id
where ur.role = 'admin';

-- Foundation seed should create an audit event.
select id, action, entity_type, created_at, detail
from public.audit_events
where action = 'organization_foundation_seeded'
order by created_at desc
limit 5;
