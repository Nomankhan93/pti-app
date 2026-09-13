export const ORGANIZATION_ROLES = [
  'super_admin',
  'central_leadership',
  'national_operations_admin',
  'national_finance_admin',
  'provincial_coordinator',
  'divisional_coordinator',
  'district_coordinator',
  'tehsil_coordinator',
  'supervisor',
  'auditor',
] as const

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number]

export const ORGANIZATION_LEVELS = [
  'central',
  'province',
  'division',
  'district',
  'tehsil',
] as const

export type OrganizationLevel = (typeof ORGANIZATION_LEVELS)[number]

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  super_admin: 'Super Admin',
  central_leadership: 'Central Leadership',
  national_operations_admin: 'National Operations Admin',
  national_finance_admin: 'National Finance Admin',
  provincial_coordinator: 'Provincial Coordinator',
  divisional_coordinator: 'Divisional Coordinator',
  district_coordinator: 'District Coordinator',
  tehsil_coordinator: 'Tehsil Coordinator',
  supervisor: 'Supervisor',
  auditor: 'Auditor / Read-only',
}

export const ORGANIZATION_LEVEL_LABELS: Record<OrganizationLevel, string> = {
  central: 'Central',
  province: 'Province / Territory',
  division: 'Division',
  district: 'District',
  tehsil: 'Tehsil / Taluka',
}

const EXPECTED_LEVEL_BY_ROLE: Partial<Record<OrganizationRole, OrganizationLevel>> = {
  super_admin: 'central',
  central_leadership: 'central',
  national_operations_admin: 'central',
  national_finance_admin: 'central',
  provincial_coordinator: 'province',
  divisional_coordinator: 'division',
  district_coordinator: 'district',
  tehsil_coordinator: 'tehsil',
}

export function expectedOrganizationLevel(role: OrganizationRole) {
  return EXPECTED_LEVEL_BY_ROLE[role] ?? null
}

export function organizationRoleLabel(role: string) {
  return ORGANIZATION_ROLE_LABELS[role as OrganizationRole] ?? role
}

export function organizationLevelLabel(level: string) {
  return ORGANIZATION_LEVEL_LABELS[level as OrganizationLevel] ?? level
}
