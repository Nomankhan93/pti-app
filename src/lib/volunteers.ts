import type { Database, Tables } from './supabase/database.types'

export type GeographyRow = Tables<'geographies'>
export type OrganizationUnitRow = Tables<'organization_units'>
export type VolunteerProfile = Tables<'volunteer_profiles'>
export type VolunteerAvailability = Database['public']['Enums']['volunteer_availability']

export type VolunteerDirectoryRow = Pick<
  VolunteerProfile,
  | 'id'
  | 'full_name'
  | 'mobile'
  | 'profession'
  | 'education'
  | 'languages'
  | 'skills'
  | 'availability'
  | 'availability_notes'
  | 'preferred_duties'
  | 'vehicle_available'
  | 'driving_available'
  | 'medical_skills'
  | 'social_media_skills'
  | 'it_skills'
  | 'crowd_management'
  | 'logistics'
  | 'security_discipline'
  | 'geography_id'
  | 'org_unit_id'
  | 'is_active'
  | 'updated_at'
> & { member_linked: boolean }

export const volunteerAvailabilityOptions: Array<{ value: VolunteerAvailability; label: string }> = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited availability' },
  { value: 'unavailable', label: 'Currently unavailable' },
]

export const volunteerSkillSuggestions = [
  'Community outreach',
  'Event registration',
  'Public speaking',
  'Data entry',
  'Graphic design',
  'Photography / video',
  'First aid',
  'Transport coordination',
  'Route coordination',
  'Call center / helpline',
] as const

export const preferredDutyOptions = [
  'Registration Desk',
  'Transport',
  'Crowd Management',
  'Medical Support',
  'Social Media',
  'IT / Technical',
  'Logistics',
  'Security / Discipline',
  'Communications',
  'Fundraising Support',
] as const

export type GeographySelection = {
  provinceId: string
  divisionId: string
  districtId: string
  tehsilId: string
}

export function emptyGeographySelection(): GeographySelection {
  return { provinceId: '', divisionId: '', districtId: '', tehsilId: '' }
}

export function geographyChildren(rows: GeographyRow[], parentId: string | null, kind?: GeographyRow['kind']) {
  return rows
    .filter((row) => row.parent_id === parentId && row.is_active && (!kind || row.kind === kind))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function geographySelectionForTehsil(rows: GeographyRow[], tehsilId: string): GeographySelection {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const selection = emptyGeographySelection()
  let current = byId.get(tehsilId)

  while (current) {
    if (current.kind === 'tehsil') selection.tehsilId = current.id
    if (current.kind === 'district') selection.districtId = current.id
    if (current.kind === 'division') selection.divisionId = current.id
    if (current.kind === 'province') selection.provinceId = current.id
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }

  return selection
}

export function geographyPath(rows: GeographyRow[], geographyId: string) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const parts: GeographyRow[] = []
  let current = byId.get(geographyId)

  while (current) {
    parts.unshift(current)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
  }

  return parts.map((row) => row.name).join(' › ')
}

export function splitTags(value: string, maxItems = 24) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, maxItems)
}

export function profileCompletion(profile: VolunteerProfile | null) {
  if (!profile) return 0

  const checks = [
    Boolean(profile.full_name),
    Boolean(profile.mobile),
    Boolean(profile.geography_id),
    Boolean(profile.profession),
    Boolean(profile.education),
    profile.skills.length > 0,
    profile.languages.length > 0,
    profile.preferred_duties.length > 0,
    Boolean(profile.address),
    Boolean(profile.emergency_contact_name && profile.emergency_contact_mobile),
    Boolean(profile.bio),
  ]

  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function capabilityLabels(profile: Pick<VolunteerProfile, 'vehicle_available' | 'driving_available' | 'medical_skills' | 'social_media_skills' | 'it_skills' | 'crowd_management' | 'logistics' | 'security_discipline'>) {
  const result: string[] = []
  if (profile.vehicle_available) result.push('Vehicle available')
  if (profile.driving_available) result.push('Driving')
  if (profile.medical_skills) result.push('Medical')
  if (profile.social_media_skills) result.push('Social media')
  if (profile.it_skills) result.push('IT')
  if (profile.crowd_management) result.push('Crowd management')
  if (profile.logistics) result.push('Logistics')
  if (profile.security_discipline) result.push('Security / discipline')
  return result
}
