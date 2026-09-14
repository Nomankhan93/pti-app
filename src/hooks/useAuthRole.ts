import { useCallback, useEffect, useState } from 'react'
import { adminRoleNames } from '../config/navigation'
import { supabase } from '../lib/supabase/client'

type AuthUser = {
  id: string
  email?: string | null
}

export function useAuthRole() {
  const [authLoading, setAuthLoading] = useState(true)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasVolunteerWorkbenchAccess, setHasVolunteerWorkbenchAccess] = useState(false)
  const [hasOperationsWorkbenchAccess, setHasOperationsWorkbenchAccess] = useState(false)
  const [hasFinanceWorkbenchAccess, setHasFinanceWorkbenchAccess] = useState(false)
  const [hasLeadershipAccess, setHasLeadershipAccess] = useState(false)
  const [hasCommandCenterAccess, setHasCommandCenterAccess] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [accountEmail, setAccountEmail] = useState('')

  const checkAdmin = useCallback(async (userId: string) => {
    const [legacyResult, scopedResult] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', [...adminRoleNames])
        .limit(1),
      supabase
        .from('organization_role_assignments')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .limit(1),
    ])

    const error = legacyResult.error ?? scopedResult.error
    if (error) {
      console.error('Admin role check failed:', error.message)
      return false
    }

    return Boolean(legacyResult.data?.length || scopedResult.data?.length)
  }, [])

  const checkVolunteerWorkbench = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_volunteer_workbench_access')
    if (error) return false
    return Boolean(data?.[0]?.can_view)
  }, [])

  const checkOperationsWorkbench = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_operations_workbench_access')
    if (error) return false
    return Boolean(data?.[0]?.can_view)
  }, [])

  const checkFinanceWorkbench = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_finance_workbench_access')
    if (error) return false
    return Boolean(data?.[0]?.can_view)
  }, [])

  const checkLeadership = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_leadership_access')
    if (error) return false
    return Boolean(data?.[0]?.can_view)
  }, [])

  const checkCommandCenter = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_command_center_access')
    if (error) return false
    return Boolean(data?.[0]?.can_view)
  }, [])

  const checkNotificationCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_notification_unread_count')
    if (error) return 0
    return Number(data ?? 0) || 0
  }, [])

  const syncAuthState = useCallback(
    async (user?: AuthUser | null) => {
      const userId = user?.id ?? null

      setIsLoggedIn(Boolean(userId))
      setAccountEmail(user?.email ?? '')

      if (userId) {
        const [adminAccess, volunteerAccess, operationsAccess, financeAccess, leadershipAccess, commandCenterAccess, notificationCount] = await Promise.all([
          checkAdmin(userId),
          checkVolunteerWorkbench(),
          checkOperationsWorkbench(),
          checkFinanceWorkbench(),
          checkLeadership(),
          checkCommandCenter(),
          checkNotificationCount(),
        ])
        setIsAdmin(adminAccess)
        setHasVolunteerWorkbenchAccess(volunteerAccess)
        setHasOperationsWorkbenchAccess(operationsAccess)
        setHasFinanceWorkbenchAccess(financeAccess)
        setHasLeadershipAccess(leadershipAccess)
        setHasCommandCenterAccess(commandCenterAccess)
        setUnreadNotificationCount(notificationCount)
      } else {
        setIsAdmin(false)
        setHasVolunteerWorkbenchAccess(false)
        setHasOperationsWorkbenchAccess(false)
        setHasFinanceWorkbenchAccess(false)
        setHasLeadershipAccess(false)
        setHasCommandCenterAccess(false)
        setUnreadNotificationCount(0)
      }

      setAuthLoading(false)
    },
    [checkAdmin, checkCommandCenter, checkFinanceWorkbench, checkLeadership, checkNotificationCount, checkOperationsWorkbench, checkVolunteerWorkbench],
  )

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        console.error('Session load failed:', error.message)
        setIsLoggedIn(false)
        setIsAdmin(false)
        setHasVolunteerWorkbenchAccess(false)
        setHasOperationsWorkbenchAccess(false)
        setHasFinanceWorkbenchAccess(false)
        setHasLeadershipAccess(false)
        setHasCommandCenterAccess(false)
        setUnreadNotificationCount(0)
        setAccountEmail('')
        setAuthLoading(false)
        return
      }

      await syncAuthState(data.session?.user ?? null)
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      void syncAuthState(session?.user ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncAuthState])

  useEffect(() => {
    async function refreshNotificationCount() {
      if (!isLoggedIn) return
      setUnreadNotificationCount(await checkNotificationCount())
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') void refreshNotificationCount()
    }

    window.addEventListener('pti:notifications-changed', refreshNotificationCount)
    document.addEventListener('visibilitychange', handleVisibility)
    const timer = window.setInterval(() => void refreshNotificationCount(), 60_000)

    return () => {
      window.removeEventListener('pti:notifications-changed', refreshNotificationCount)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.clearInterval(timer)
    }
  }, [checkNotificationCount, isLoggedIn])

  const accountInitial = (
    accountEmail.split('@')[0]?.trim().charAt(0) || 'M'
  ).toUpperCase()

  async function logout() {
    setLogoutLoading(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Logout failed:', error.message)
      setLogoutLoading(false)
      return false
    }

    setIsLoggedIn(false)
    setIsAdmin(false)
    setHasVolunteerWorkbenchAccess(false)
    setHasOperationsWorkbenchAccess(false)
    setHasFinanceWorkbenchAccess(false)
    setHasLeadershipAccess(false)
    setHasCommandCenterAccess(false)
    setUnreadNotificationCount(0)
    setAccountEmail('')
    setLogoutLoading(false)
    return true
  }

  return {
    authLoading,
    logoutLoading,
    isLoggedIn,
    isAdmin,
    hasVolunteerWorkbenchAccess,
    hasOperationsWorkbenchAccess,
    hasFinanceWorkbenchAccess,
    hasLeadershipAccess,
    hasCommandCenterAccess,
    unreadNotificationCount,
    accountEmail,
    accountInitial,
    logout,
  }
}
