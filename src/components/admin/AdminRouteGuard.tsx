import { useNavigate } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'
import { useAuthRole } from '../../hooks/useAuthRole'

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { authLoading, isLoggedIn, isAdmin } = useAuthRole()

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      void navigate({ to: '/login' })
      return
    }
    if (!isAdmin) void navigate({ to: '/dashboard' })
  }, [authLoading, isAdmin, isLoggedIn, navigate])

  if (authLoading) {
    return (
      <div className="rounded-[2rem] bg-white p-8 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-200/70">
        Checking admin access…
      </div>
    )
  }

  if (!isLoggedIn || !isAdmin) return null

  return children
}
