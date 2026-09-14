import { describe, expect, it } from 'vitest'
import { notificationUnreadLabel, readRate, roleLabel, severityTone } from './notifications'

describe('notification helpers', () => {
  it('formats unread counters without oversized badges', () => {
    expect(notificationUnreadLabel(0)).toBeUndefined()
    expect(notificationUnreadLabel(7)).toBe('7')
    expect(notificationUnreadLabel(120)).toBe('99+')
  })

  it('normalizes read-rate boundaries', () => {
    expect(readRate(5, 10)).toBe(50)
    expect(readRate(12, 10)).toBe(100)
    expect(readRate(1, 0)).toBe(0)
  })

  it('renders human role labels and severity tones', () => {
    expect(roleLabel('district_coordinator')).toBe('District Coordinator')
    expect(severityTone('critical')).toContain('red')
    expect(severityTone('info')).toContain('sky')
  })
})
