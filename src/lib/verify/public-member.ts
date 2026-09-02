export type VerifyMemberStatus = 'pending' | 'approved' | 'rejected'

export type VerifyMemberRow = {
  id: string
  member_no: string | null
  full_name: string
  district: string
  taluka: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  status: VerifyMemberStatus
  approved_at: string | null
}

export type PublicVerifyMember = {
  id: string
  member_no: string | null
  full_name: string
  district: string
  taluka: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  status: VerifyMemberStatus
  approved_at: string | null
}

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

  if (member.status !== 'approved') {
    return {
      found: true,
      verified: false,
      member: {
        id: member.id,
        member_no: member.member_no,
        full_name: NOT_DISCLOSED,
        district: NOT_DISCLOSED,
        taluka: null,
        designation: null,
        designation_level: null,
        designation_area: null,
        status: member.status,
        approved_at: null,
      },
    }
  }

  return {
    found: true,
    verified: true,
    member: {
      id: member.id,
      member_no: member.member_no,
      full_name: member.full_name,
      district: member.district,
      taluka: member.taluka,
      designation: member.designation,
      designation_level: member.designation_level,
      designation_area: member.designation_area,
      status: member.status,
      approved_at: member.approved_at,
    },
  }
}

export function canExposeMemberPhoto(member: VerifyMemberRow | null) {
  return Boolean(member?.status === 'approved')
}
