import { describe, expect, it } from 'vitest'
import {
  expectedOrganizationLevel,
  organizationLevelLabel,
  organizationRoleLabel,
} from './organization'

describe('organization helpers', () => {
  it('maps scoped coordinator roles to their required organization level', () => {
    expect(expectedOrganizationLevel('provincial_coordinator')).toBe('province')
    expect(expectedOrganizationLevel('divisional_coordinator')).toBe('division')
    expect(expectedOrganizationLevel('district_coordinator')).toBe('district')
    expect(expectedOrganizationLevel('tehsil_coordinator')).toBe('tehsil')
  })

  it('allows supervisor and auditor roles at flexible scopes', () => {
    expect(expectedOrganizationLevel('supervisor')).toBeNull()
    expect(expectedOrganizationLevel('auditor')).toBeNull()
  })

  it('renders human-readable labels', () => {
    expect(organizationRoleLabel('national_operations_admin')).toBe('National Operations Admin')
    expect(organizationLevelLabel('tehsil')).toBe('Tehsil / Taluka')
  })
})
