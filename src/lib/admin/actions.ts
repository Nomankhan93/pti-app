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

  const [{ data: legacyRole, error: legacyRoleError }, { data: superAdminRole, error: superAdminRoleError }] = await Promise.all([
    supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle(),
    supabaseAdmin
      .from('organization_role_assignments')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ])

  if (legacyRoleError && superAdminRoleError) {
    throw new Error(legacyRoleError.message || superAdminRoleError.message)
  }

  if (!legacyRole && !superAdminRole) {
    throw new Error('Membership admin access required.')
  }

  return {
    supabaseAdmin,
    user: userData.user,
  }
}

export const setMemberActiveAction = createServerFn({ method: 'POST' })
  .validator(
    (data: { memberId: string; isActive: boolean; accessToken: string }) => {
      if (!data.memberId) throw new Error('Member ID is required.')
      if (!data.accessToken) throw new Error('Access token is required.')
      return data
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await requireAdmin(data.accessToken)

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .update({ is_active: data.isActive })
      .eq('id', data.memberId)
      .select('id, member_no, is_active')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return member
  })
