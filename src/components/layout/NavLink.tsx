import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type HeaderRoute = '/' | '/signup' | '/login' | '/dashboard' | '/register' | '/card' | '/admin'

export function NavLink({
  to,
  children,
  compact = false,
}: {
  to: HeaderRoute
  children: ReactNode
  compact?: boolean
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-white hover:text-slate-950 hover:shadow-sm ${
        compact ? 'lg:px-2.5' : ''
      }`}
      activeProps={{
        className:
          'inline-flex items-center rounded-full bg-slate-950 px-3 py-2 text-sm font-extrabold text-white shadow-sm',
      }}
    >
      {children}
    </Link>
  )
}
