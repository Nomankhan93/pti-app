import { describe, expect, it } from 'vitest'
import type { GeographyRow, VolunteerProfile } from './volunteers'
import {
  capabilityLabels,
  geographyPath,
  geographySelectionForTehsil,
  splitTags,
} from './volunteers'

const geographies = [
  { id: 'p', parent_id: null, kind: 'province', name: 'Sindh', is_active: true },
  { id: 'd1', parent_id: 'p', kind: 'division', name: 'Mirpur Khas Division', is_active: true },
  { id: 'd2', parent_id: 'd1', kind: 'district', name: 'Umerkot', is_active: true },
  { id: 't', parent_id: 'd2', kind: 'tehsil', name: 'Kunri', is_active: true },
].map((row) => ({ ...row, code: row.id, source_note: null, created_at: '', updated_at: '' })) as GeographyRow[]

describe('volunteer geography helpers', () => {
  it('reconstructs a volunteer tehsil selection', () => {
    expect(geographySelectionForTehsil(geographies, 't')).toEqual({
      provinceId: 'p',
      divisionId: 'd1',
      districtId: 'd2',
      tehsilId: 't',
    })
  })

  it('formats a readable hierarchy path', () => {
    expect(geographyPath(geographies, 't')).toBe('Sindh › Mirpur Khas Division › Umerkot › Kunri')
  })
})

describe('volunteer profile helpers', () => {
  it('deduplicates comma-separated tags', () => {
    expect(splitTags('IT, Logistics, IT,  First aid ')).toEqual(['IT', 'Logistics', 'First aid'])
  })

  it('reports capability labels', () => {
    const profile = {
      vehicle_available: true,
      driving_available: true,
      medical_skills: false,
      social_media_skills: true,
      it_skills: false,
      crowd_management: false,
      logistics: true,
      security_discipline: false,
    } as VolunteerProfile

    expect(capabilityLabels(profile)).toEqual(['Vehicle available', 'Driving', 'Social media', 'Logistics'])
  })
})
