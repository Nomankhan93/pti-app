// src/lib/designation-assignment.ts
export const designationLevelOptions = [
  'UC',
  'City',
  'Taluka',
  'District',
  'Divisional',
  'Provincial',
] as const

export type DesignationLevel = (typeof designationLevelOptions)[number]

export const designationTitleOptions = [
  'President',
  'Senior Vice President',
  'Vice President',
  'Vice President-I',
  'Vice President-II',
  'Vice President-III',
  'General Secretary',
  'Deputy General Secretary',
  'Information Secretary',
  'Deputy Information Secretary',
  'Finance Secretary',
  'Deputy Finance Secretary',
  'Record Secretary',
  'Social Media Person',
  'Social Media Person-I',
  'Social Media Person-II',
  'Coordinator',
  'Coordinator-I',
  'Coordinator-II',
] as const

export type DesignationTitle = (typeof designationTitleOptions)[number]

export const recommendedDesignationsByLevel: Record<
  DesignationLevel,
  readonly DesignationTitle[]
> = {
  UC: designationTitleOptions,
  City: designationTitleOptions,
  Taluka: designationTitleOptions,
  District: designationTitleOptions,
  Divisional: designationTitleOptions,
  Provincial: designationTitleOptions,
}

export function isDesignationLevel(value: string): value is DesignationLevel {
  return designationLevelOptions.includes(value as DesignationLevel)
}

export function isDesignationTitle(value: string): value is DesignationTitle {
  return designationTitleOptions.includes(value as DesignationTitle)
}

export function getRecommendedDesignations(level: string): string[] {
  if (!isDesignationLevel(level)) return []
  return [...recommendedDesignationsByLevel[level]]
}

export function getDefaultDesignationArea(level: string, member: {
  district?: string | null
  taluka?: string | null
}) {
  if (level === 'Provincial') return 'Sindh'
  if (level === 'Divisional') return ''
  if (level === 'District') return member.district ?? ''
  if (level === 'Taluka' || level === 'City' || level === 'UC') {
    return member.taluka || member.district || ''
  }

  return ''
}
