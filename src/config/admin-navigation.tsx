import type { ReactNode } from 'react'
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Download,
  IdCard,
  LayoutDashboard,
  SearchCheck,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
} from 'lucide-react'

export type AdminNavigationRoute =
  | '/admin'
  | '/admin/organization'
  | '/admin/roles'
  | '/admin/audit'
  | '/operations/volunteers'

export type AdminNavigationItem = {
  label: string
  description?: string
  to?: AdminNavigationRoute
  icon: ReactNode
  badge?: string
  disabled?: boolean
}

export type AdminNavigationGroup = {
  title: string
  items: AdminNavigationItem[]
}

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    title: 'Membership Console',
    items: [
      {
        label: 'Dashboard Overview',
        description: 'Live counts, filters and recent members',
        to: '/admin',
        icon: <LayoutDashboard size={17} />,
      },
      {
        label: 'All Members',
        description: 'Search every registered PTI member',
        to: '/admin',
        icon: <Users size={17} />,
      },
    ],
  },
  {
    title: 'Membership Tools',
    items: [
      {
        label: 'Digital Cards',
        description: 'Open cards from member detail pages',
        to: '/admin',
        icon: <IdCard size={17} />,
      },
      {
        label: 'CSV Export',
        description: 'Download filtered member records',
        to: '/admin',
        icon: <Download size={17} />,
      },
      {
        label: 'Data Verification',
        description: 'CNIC, mobile and area review checklist',
        to: '/admin',
        icon: <SearchCheck size={17} />,
      },
      {
        label: 'Membership Status',
        description: 'Activate or deactivate memberships from member detail',
        to: '/admin',
        icon: <ClipboardList size={17} />,
      },
      {
        label: 'Assign Designations',
        description: 'Open member detail and assign official card title',
        to: '/admin',
        icon: <BriefcaseBusiness size={17} />,
      },
    ],
  },
  {
    title: 'Organization & Access',
    items: [
      {
        label: 'Organization',
        description: 'Central to province, division, district and tehsil hierarchy',
        to: '/admin/organization',
        icon: <Building2 size={17} />,
      },
      {
        label: 'Roles & Permissions',
        description: 'Assign controlled office-bearer and coordinator access',
        to: '/admin/roles',
        icon: <UserCog size={17} />,
      },
      {
        label: 'Audit Log',
        description: 'Review organization and access-control activity',
        to: '/admin/audit',
        icon: <Activity size={17} />,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Volunteer Workbench',
        description: 'Search and manage volunteers within authorized scope',
        to: '/operations/volunteers',
        icon: <UsersRound size={17} />,
        badge: 'PHASE 2',
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        label: 'Scoped RBAC',
        description: 'Database-enforced organization access foundation',
        to: '/admin/roles',
        icon: <ShieldCheck size={17} />,
        badge: 'LIVE',
      },
    ],
  },
]
