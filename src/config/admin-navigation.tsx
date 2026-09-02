import type { ReactNode } from 'react'
import {
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  Clock3,
  Download,
  IdCard,
  LayoutDashboard,
  SearchCheck,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react'

export type AdminNavigationRoute = '/admin'

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
        description: 'Live counts, filters and recent applications',
        to: '/admin',
        icon: <LayoutDashboard size={17} />,
      },
      {
        label: 'All Applications',
        description: 'Search every submitted membership form',
        to: '/admin',
        icon: <Users size={17} />,
      },
    ],
  },
  {
    title: 'Review Queue',
    items: [
      {
        label: 'Pending Review',
        description: 'Applications waiting for admin action',
        to: '/admin',
        icon: <Clock3 size={17} />,
      },
      {
        label: 'Approved Members',
        description: 'Members with active digital card access',
        to: '/admin',
        icon: <BadgeCheck size={17} />,
      },
      {
        label: 'Rejected / Returned',
        description: 'Applications needing correction',
        to: '/admin',
        icon: <XCircle size={17} />,
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
        label: 'Approvals Workflow',
        description: 'Approve or reject from detail page',
        to: '/admin',
        icon: <ClipboardList size={17} />,
      },
      {
        label: 'Assign Designations',
        description: 'Open approved member detail and assign official card title',
        to: '/admin',
        icon: <BriefcaseBusiness size={17} />,
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        label: 'Roles & Permissions',
        description: 'Controlled through Supabase user_roles table',
        icon: <ShieldCheck size={17} />,
        badge: 'DB',
        disabled: true,
      },
    ],
  },
]
