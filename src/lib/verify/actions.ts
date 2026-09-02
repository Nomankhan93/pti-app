import { createServerFn } from '@tanstack/react-start'
import { createSupabaseAdminClient } from '../supabase/admin'
import {
  buildPublicVerifyPayload,
  canExposeMemberPhoto,
  type VerifyMemberRow,
} from './public-member'

type VerifyMemberInput = {
  memberNo: string
}

export const verifyMemberAction = createServerFn({ method: 'POST' })
  .validator((data: VerifyMemberInput) => {
    if (!data.memberNo || data.memberNo.trim().length < 3) {
      throw new Error('Member number is required.')
    }

    return {
      memberNo: data.memberNo.trim(),
    }
  })
  .handler(async ({ data }) => {
    const supabaseAdmin = createSupabaseAdminClient()

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select(
        'id, member_no, full_name, district, taluka, designation, designation_level, designation_area, photo_url, status, approved_at',
      )
      .eq('member_no', data.memberNo)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    const publicPayload = buildPublicVerifyPayload(member as VerifyMemberRow | null)
    let photoSignedUrl: string | null = null

    if (canExposeMemberPhoto(member as VerifyMemberRow | null) && member?.photo_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from('member-photos')
        .createSignedUrl(member.photo_url, 60 * 10)

      photoSignedUrl = signed?.signedUrl ?? null
    }

    return {
      ...publicPayload,
      photoSignedUrl,
    }
  })
