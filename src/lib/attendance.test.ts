import { describe, expect, it } from 'vitest'
import { attendanceRate, attendanceStatusTone, participationHours } from './attendance'

describe('attendance helpers', () => {
  it('counts present and late as attended', () => {
    expect(attendanceRate(7, 1, 2)).toBe(80)
  })

  it('returns zero rate when no attendance is recorded', () => {
    expect(attendanceRate(0, 0, 0, 0)).toBe(0)
  })

  it('maps statuses to distinct semantic tones', () => {
    expect(attendanceStatusTone('present')).toBe('emerald')
    expect(attendanceStatusTone('late')).toBe('amber')
    expect(attendanceStatusTone('absent')).toBe('red')
    expect(attendanceStatusTone('excused')).toBe('blue')
    expect(attendanceStatusTone(null)).toBe('slate')
  })

  it('calculates checked-in participation hours safely', () => {
    expect(participationHours('2026-09-13T10:00:00Z', '2026-09-13T12:30:00Z')).toBe(2.5)
    expect(participationHours(null, '2026-09-13T12:30:00Z')).toBe(0)
  })
})
