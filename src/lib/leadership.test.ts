import { describe, expect, it } from 'vitest'
import { dateRangePreset, normalizeDashboard, percentage, leadershipReportCsv } from './leadership'

describe('leadership reporting helpers', () => {
  it('calculates bounded percentages', () => {
    expect(percentage(8, 10)).toBe(80)
    expect(percentage(1, 0)).toBe(0)
    expect(percentage(50, 10)).toBe(100)
  })

  it('creates a valid date preset', () => {
    const range = dateRangePreset(30)
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(range.from <= range.to).toBe(true)
  })

  it('rejects malformed dashboard payloads', () => {
    expect(normalizeDashboard(null)).toBeNull()
    expect(normalizeDashboard({})).toBeNull()
  })

  it('exports scope and child rollups to CSV', () => {
    const csv = leadershipReportCsv({
      scope: { id: '1', parent_id: null, name: 'PTI Central', level: 'central', code: 'CENTRAL', from: '2026-09-01', to: '2026-09-30', bucket: 'day' },
      path: [],
      kpis: {
        members_active: 10, members_new: 2, members_unmapped: 0,
        volunteers_active: 4, volunteers_available: 3, volunteers_new: 1,
        operations_active: 1, operations_created: 1, operations_completed: 0,
        duties_assigned: 4, duties_completed: 2,
        attendance_present: 3, attendance_late: 1, attendance_absent: 0, attendance_excused: 0,
        active_campaigns: 1, donations_count: 2, finance_by_currency: {},
      },
      children: [{ id: '2', name: 'Sindh', level: 'province', code: 'PK-SD', members: 8, volunteers: 3, active_operations: 1, participation: 4, verified_pkr: 1000 }],
      trends: [], operations: [], campaigns: [],
    })
    expect(csv).toContain('PTI Leadership Monitoring Report')
    expect(csv).toContain('Sindh')
  })
})
