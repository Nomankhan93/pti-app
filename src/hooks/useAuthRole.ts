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
  const [accountEmail, setAccountEmail] = useState('')

  const checkAdmin = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', [...adminRoleNames])
      .limit(1)

    if (error) {
      console.error('Admin role check failed:', error.message)
      return false
    }

    return Boolean(data?.length)
  }, [])

  const syncAuthState = useCallback(
    async (user?: AuthUser | null) => {
      const userId = user?.id ?? null

      setIsLoggedIn(Boolean(userId))
      setAccountEmail(user?.email ?? '')

      if (userId) setIsAdmin(await checkAdmin(userId))
      else setIsAdmin(false)

      setAuthLoading(false)
    },
    [checkAdmin],
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
    setAccountEmail('')
    setLogoutLoading(false)
    return true
  }

  return {
    authLoading,
    logoutLoading,
    isLoggedIn,
    isAdmin,
    accountEmail,
    accountInitial,
    logout,
  }
}
