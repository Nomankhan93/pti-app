import { describe, expect, it } from 'vitest'
import {
  buildPublicVerifyPayload,
  canExposeMemberPhoto,
  type VerifyMemberRow,
} from './public-member'

const activeMember: VerifyMemberRow = {
  id: 'member-1',
  member_no: 'PTI-2026-0001',
  full_name: 'Test Member',
  district: 'Umerkot',
  taluka: 'Umerkot',
  designation: null,
  designation_level: null,
  designation_area: null,
  is_active: true,
  issued_at: '2026-09-13T00:00:00.000Z',
}

describe('public member verification', () => {
  it('returns not found for missing member', () => {
    expect(buildPublicVerifyPayload(null)).toEqual({
      found: false,
      verified: false,
      member: null,
    })
  })

  it('does not expose inactive member identity', () => {
    expect(buildPublicVerifyPayload({ ...activeMember, is_active: false })).toEqual({
      found: true,
      verified: false,
      member: {
        ...activeMember,
        is_active: false,
        full_name: 'Not disclosed',
        district: 'Not disclosed',
        taluka: null,
        designation: null,
        designation_level: null,
        designation_area: null,
      },
    })
  })

  it('exposes active self-issued membership', () => {
    expect(buildPublicVerifyPayload(activeMember)).toEqual({
      found: true,
      verified: true,
      member: activeMember,
    })
  })

  it('allows photos only for active memberships', () => {
    expect(canExposeMemberPhoto({ ...activeMember, is_active: false })).toBe(false)
    expect(canExposeMemberPhoto(activeMember)).toBe(true)
  })
})
