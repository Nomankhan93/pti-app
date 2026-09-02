import type { ReactNode } from 'react'
import {
  ClipboardList,
  Home,
  IdCard,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'

export const adminRoleNames = ['admin'] as const

export type HeaderMenuKey = 'account' | null

type KnownRoute = '/' | '/signup' | '/login' | '/dashboard' | '/register' | '/card' | '/admin'

export type NavigationItem = {
  label: string
  description?: string
  to?: KnownRoute
  icon?: ReactNode
  action?: 'logout'
  badge?: string
  adminOnly?: boolean
}

export const publicNavigationItems: NavigationItem[] = [
  {
    label: 'Home',
    to: '/',
    icon: <Home className="h-4 w-4" />,
  },
]

export const memberNavigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    description: 'Track application status',
    to: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Register',
    description: 'Submit or update membership form',
    to: '/register',
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    label: 'Digital Card',
    description: 'Approved member QR card',
    to: '/card',
    icon: <IdCard className="h-4 w-4" />,
  },
]

export const loggedOutAccountItems: NavigationItem[] = [
  {
    label: 'Join Now',
    description: 'Create account and start membership',
    to: '/signup',
    icon: <UserPlus className="h-4 w-4" />,
  },
  {
    label: 'Login',
    description: 'Open your member dashboard',
    to: '/login',
    icon: <LogIn className="h-4 w-4" />,
  },
]

export function getAccountItems(isAdmin: boolean): NavigationItem[] {
  return [
    ...memberNavigationItems,
    ...(isAdmin
      ? [
          {
            label: 'Admin Panel',
            description: 'Review and approve applications',
            to: '/admin' as const,
            icon: <ShieldCheck className="h-4 w-4" />,
            badge: 'Admin',
            adminOnly: true,
          },
        ]
      : []),
    {
      label: 'Logout',
      description: 'Sign out from this device',
      action: 'logout',
      icon: <LogOut className="h-4 w-4" />,
    },
  ]
}
