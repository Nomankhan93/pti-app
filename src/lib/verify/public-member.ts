export type VerifyMemberRow = {
  member_no: string | null
  full_name: string
  district: string
  taluka: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  is_active: boolean
  issued_at: string
  user_id: string
  photo_url: string | null
}

export type PublicVerifyMember = Omit<VerifyMemberRow, 'user_id' | 'photo_url'>

export type PublicVerifyPayload = {
  found: boolean
  verified: boolean
  member: PublicVerifyMember | null
}

export function buildPublicVerifyPayload(
  member: VerifyMemberRow | null,
): PublicVerifyPayload {
  // Deliberately make inactive and unknown references indistinguishable.
  if (!member?.is_active) {
    return {
      found: false,
      verified: false,
      member: null,
    }
  }

  const { user_id: _userId, photo_url: _photoUrl, ...publicMember } = member

  return {
    found: true,
    verified: true,
    member: publicMember,
  }
}

export function canExposeMemberPhoto(member: VerifyMemberRow | null) {
  if (!member?.is_active || !member.photo_url || !member.user_id) return false
  return member.photo_url.startsWith(`${member.user_id}/`)
}
