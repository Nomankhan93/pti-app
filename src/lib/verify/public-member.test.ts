import { describe, expect, it } from 'vitest'
import {
  buildPublicVerifyPayload,
  canExposeMemberPhoto,
  type VerifyMemberRow,
} from './public-member'

const approvedMember: VerifyMemberRow = {
  id: 'member-1',
  member_no: 'BBJF-2026-0001',
  full_name: 'Ali Khan',
  district: 'Umerkot',
  taluka: 'Kunri',
  designation: 'Member',
  designation_level: 'City',
  designation_area: 'Kunri',
  status: 'approved',
  approved_at: '2026-06-13T00:00:00.000Z',
}

describe('buildPublicVerifyPayload', () => {
  it('returns a minimal not-found payload', () => {
    expect(buildPublicVerifyPayload(null)).toEqual({
      found: false,
      verified: false,
      member: null,
    })
  })

  it('does not disclose private identity fields for pending members', () => {
    const payload = buildPublicVerifyPayload({
      ...approvedMember,
      status: 'pending',
      approved_at: null,
    })

    expect(payload).toEqual({
      found: true,
      verified: false,
      member: {
        id: 'member-1',
        member_no: 'BBJF-2026-0001',
        full_name: 'Not disclosed',
        district: 'Not disclosed',
        taluka: null,
        designation: null,
        designation_level: null,
        designation_area: null,
        status: 'pending',
        approved_at: null,
      },
    })
  })

  it('exposes public member fields only after approval', () => {
    expect(buildPublicVerifyPayload(approvedMember)).toEqual({
      found: true,
      verified: true,
      member: approvedMember,
    })
  })
})

describe('canExposeMemberPhoto', () => {
  it('allows photos only for approved members', () => {
    expect(canExposeMemberPhoto(null)).toBe(false)
    expect(canExposeMemberPhoto({ ...approvedMember, status: 'pending' })).toBe(false)
    expect(canExposeMemberPhoto({ ...approvedMember, status: 'rejected' })).toBe(false)
    expect(canExposeMemberPhoto(approvedMember)).toBe(true)
  })
})
