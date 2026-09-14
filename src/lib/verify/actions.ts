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

const VERIFY_TOKEN_RE = /^[a-f0-9]{64}$/i

export const verifyMemberAction = createServerFn({ method: 'POST' })
  .validator((data: VerifyMemberInput) => {
    const reference = data.memberNo?.trim() ?? ''
    if (!VERIFY_TOKEN_RE.test(reference)) {
      throw new Error('Invalid verification reference.')
    }

    return { memberNo: reference }
  })
  .handler(async ({ data }) => {
    const supabaseAdmin = createSupabaseAdminClient()

    const { error: budgetError } = await supabaseAdmin.rpc(
      'consume_public_verification_budget',
      { p_reference: data.memberNo },
    )

    if (budgetError) {
      throw new Error(budgetError.message)
    }

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select(
        'member_no, full_name, district, taluka, designation, designation_level, designation_area, photo_url, user_id, is_active, issued_at',
      )
      .eq('public_verify_token', data.memberNo)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    const row = member as VerifyMemberRow | null
    const publicPayload = buildPublicVerifyPayload(row)
    let photoSignedUrl: string | null = null

    if (canExposeMemberPhoto(row) && row?.photo_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from('member-photos')
        .createSignedUrl(row.photo_url, 60 * 10)

      photoSignedUrl = signed?.signedUrl ?? null
    }

    return {
      ...publicPayload,
      photoSignedUrl,
    }
  })
