export type VerifyMemberRow = {
  id: string
  member_no: string | null
  full_name: string
  district: string
  taluka: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  is_active: boolean
  issued_at: string
}

export type PublicVerifyMember = VerifyMemberRow

export type PublicVerifyPayload = {
  found: boolean
  verified: boolean
  member: PublicVerifyMember | null
}

const NOT_DISCLOSED = 'Not disclosed'

export function buildPublicVerifyPayload(
  member: VerifyMemberRow | null,
): PublicVerifyPayload {
  if (!member) {
    return {
      found: false,
      verified: false,
      member: null,
    }
  }

  if (!member.is_active) {
    return {
      found: true,
      verified: false,
      member: {
        ...member,
        full_name: NOT_DISCLOSED,
        district: NOT_DISCLOSED,
        taluka: null,
        designation: null,
        designation_level: null,
        designation_area: null,
      },
    }
  }

  return {
    found: true,
    verified: true,
    member,
  }
}

export function canExposeMemberPhoto(member: VerifyMemberRow | null) {
  return Boolean(member?.is_active)
}
