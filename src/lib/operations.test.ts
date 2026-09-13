import { describe, expect, it } from 'vitest'
import { completionPercent, dutyNextActions, fromDateTimeLocal } from './operations'

describe('operations helpers', () => {
  it('enforces volunteer duty transitions', () => {
    expect(dutyNextActions('assigned')).toEqual(['accepted', 'unable'])
    expect(dutyNextActions('accepted')).toEqual(['in_progress', 'unable'])
    expect(dutyNextActions('in_progress')).toEqual(['completed', 'unable'])
    expect(dutyNextActions('completed')).toEqual([])
    expect(dutyNextActions('cancelled')).toEqual([])
  })

  it('calculates completion percentage safely', () => {
    expect(completionPercent(0, 0)).toBe(0)
    expect(completionPercent(3, 4)).toBe(75)
    expect(completionPercent(1, 3)).toBe(33)
  })

  it('normalizes date-time local values for RPC payloads', () => {
    expect(fromDateTimeLocal('')).toBeNull()
    expect(fromDateTimeLocal('not-a-date')).toBeNull()
    expect(fromDateTimeLocal('2026-09-27T09:30')).toMatch(/^2026-09-27T/)
  })
})
