import { createServerFn } from '@tanstack/react-start'
import { createSupabaseAdminClient } from '../supabase/admin'

async function requireAdmin(accessToken: string) {
  if (!accessToken) {
    throw new Error('Missing access token.')
  }

  const supabaseAdmin = createSupabaseAdminClient()

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken)

  if (userError || !userData.user) {
    throw new Error('Invalid session.')
  }

  const { data: role, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('id')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (roleError) {
    throw new Error(roleError.message)
  }

  if (!role) {
    throw new Error('Admin access required.')
  }

  return {
    supabaseAdmin,
    user: userData.user,
  }
}

export const approveMemberAction = createServerFn({ method: 'POST' })
  .validator((data: { memberId: string; accessToken: string }) => {
    if (!data.memberId) throw new Error('Member ID is required.')
    if (!data.accessToken) throw new Error('Access token is required.')
    return data
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await requireAdmin(data.accessToken)

    const { data: approved, error } = await supabaseAdmin.rpc('approve_member', {
      _member_id: data.memberId,
      _reviewed_by: user.id,
    })

    if (error) {
      throw new Error(error.message)
    }

    return approved
  })

export const rejectMemberAction = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      memberId: string
      rejectionReason: string
      accessToken: string
    }) => {
      if (!data.memberId) throw new Error('Member ID is required.')
      if (!data.accessToken) throw new Error('Access token is required.')
      if (!data.rejectionReason || data.rejectionReason.trim().length < 3) {
        throw new Error('Rejection reason is required.')
      }

      return {
        ...data,
        rejectionReason: data.rejectionReason.trim(),
      }
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await requireAdmin(data.accessToken)

    const { data: rejected, error } = await supabaseAdmin.rpc('reject_member', {
      _member_id: data.memberId,
      _rejection_reason: data.rejectionReason,
      _reviewed_by: user.id,
    })

    if (error) {
      throw new Error(error.message)
    }

    return rejected
  })
