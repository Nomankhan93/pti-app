import { describe, expect, it } from 'vitest'
import {
  buildPublicVerifyPayload,
  canExposeMemberPhoto,
  type VerifyMemberRow,
} from './public-member'

const activeMember: VerifyMemberRow = {
  member_no: 'PTI-2026-0001',
  full_name: 'Test Member',
  district: 'Umerkot',
  taluka: 'Umerkot',
  designation: null,
  designation_level: null,
  designation_area: null,
  is_active: true,
  issued_at: '2026-09-13T00:00:00.000Z',
  user_id: '11111111-1111-1111-1111-111111111111',
  photo_url: '11111111-1111-1111-1111-111111111111/photo.jpg',
}

describe('public member verification', () => {
  it('returns generic not found for missing member', () => {
    expect(buildPublicVerifyPayload(null)).toEqual({
      found: false,
      verified: false,
      member: null,
    })
  })

  it('does not reveal whether an inactive member exists', () => {
    expect(buildPublicVerifyPayload({ ...activeMember, is_active: false })).toEqual({
      found: false,
      verified: false,
      member: null,
    })
  })

  it('exposes only the approved public active-member payload', () => {
    const payload = buildPublicVerifyPayload(activeMember)
    expect(payload.found).toBe(true)
    expect(payload.verified).toBe(true)
    expect(payload.member).toMatchObject({ member_no: 'PTI-2026-0001', full_name: 'Test Member' })
    expect(payload.member).not.toHaveProperty('user_id')
    expect(payload.member).not.toHaveProperty('photo_url')
  })

  it('exposes photos only when the object belongs to the member folder', () => {
    expect(canExposeMemberPhoto({ ...activeMember, is_active: false })).toBe(false)
    expect(canExposeMemberPhoto(activeMember)).toBe(true)
    expect(canExposeMemberPhoto({ ...activeMember, photo_url: 'another-user/photo.jpg' })).toBe(false)
  })
})
