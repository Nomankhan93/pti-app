import { supabase } from '../supabase/client'

export async function hasMembershipAdminAccess(userId: string) {
  const [{ data: legacy, error: legacyError }, { data: superAdmin, error: superAdminError }] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle(),
    supabase
      .from('organization_role_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ])

  if (legacyError && superAdminError) {
    throw new Error(legacyError.message || superAdminError.message)
  }

  return Boolean(legacy || superAdmin)
}
