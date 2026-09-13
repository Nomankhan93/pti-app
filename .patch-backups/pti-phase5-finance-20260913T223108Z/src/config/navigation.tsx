import type { ReactNode } from 'react'
import {
  ClipboardList,
  HeartHandshake,
  Home,
  IdCard,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from 'lucide-react'

export const adminRoleNames = ['admin'] as const

export type HeaderMenuKey = 'account' | null

export type KnownRoute = '/' | '/signup' | '/login' | '/dashboard' | '/register' | '/card' | '/volunteer' | '/operations/volunteers' | '/operations/workbench' | '/operations/attendance' | '/admin'

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
    description: 'View active membership and card',
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
    description: 'Active membership QR card',
    to: '/card',
    icon: <IdCard className="h-4 w-4" />,
  },
  {
    label: 'Volunteer',
    description: 'Register skills and availability',
    to: '/volunteer',
    icon: <HeartHandshake className="h-4 w-4" />,
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

export function getAccountItems(isAdmin: boolean, hasVolunteerWorkbenchAccess = false, hasOperationsWorkbenchAccess = false): NavigationItem[] {
  return [
    ...memberNavigationItems,
    ...(hasVolunteerWorkbenchAccess
      ? [
          {
            label: 'Volunteer Workbench',
            description: 'Search volunteers inside your authorized area',
            to: '/operations/volunteers' as const,
            icon: <UsersRound className="h-4 w-4" />,
            badge: 'Operations',
          },
        ]
      : []),
    ...(hasOperationsWorkbenchAccess
      ? [
          {
            label: 'Operations Workbench',
            description: 'Manage operations, teams, shifts and duties',
            to: '/operations/workbench' as const,
            icon: <ListChecks className="h-4 w-4" />,
            badge: 'Phase 3',
          },
          {
            label: 'Attendance & Participation',
            description: 'QR check-in, attendance roster and participation tracking',
            to: '/operations/attendance' as const,
            icon: <ScanLine className="h-4 w-4" />,
            badge: 'Phase 4',
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            label: 'Admin Panel',
            description: 'Manage members and designations',
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
