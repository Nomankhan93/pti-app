export type NotificationKind = 'announcement' | 'alert' | 'duty_reminder' | 'operation_update'
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical'
export type NotificationAudience =
  | 'org_scope'
  | 'members'
  | 'volunteers'
  | 'organization_roles'
  | 'finance_roles'
  | 'operation_participants'
  | 'specific_users'
export type NotificationStatus = 'published' | 'cancelled'

export type CommandCenterAccess = {
  can_view: boolean
  can_manage: boolean
  default_org_unit_id: string | null
  default_org_unit_name: string | null
  default_org_unit_level: 'central' | 'province' | 'division' | 'district' | 'tehsil' | null
}

export type NotificationScope = {
  id: string
  parent_id: string | null
  level: 'central' | 'province' | 'division' | 'district' | 'tehsil'
  name: string
  code: string
}

export type NotificationOperation = {
  id: string
  org_unit_id: string
  org_unit_name: string
  title: string
  status: string
  starts_at: string | null
  ends_at: string | null
}

export type InboxNotification = {
  delivery_id: number
  message_id: string
  notification_no: string
  kind: NotificationKind
  severity: NotificationSeverity
  title: string
  body: string
  action_url: string | null
  operation_id: string | null
  org_unit_id: string
  org_unit_name: string
  published_at: string
  expires_at: string | null
  delivered_at: string
  read_at: string | null
  archived_at: string | null
}

export type CommandCenterMessage = {
  id: string
  notification_no: string
  kind: NotificationKind
  severity: NotificationSeverity
  status: NotificationStatus
  title: string
  body: string
  audience: NotificationAudience
  org_unit_id: string
  org_unit_name: string
  operation_id: string | null
  operation_title: string | null
  action_url: string | null
  published_at: string
  expires_at: string | null
  created_by: string | null
  recipient_count: number
  read_count: number
  unread_count: number
}

export const notificationKindLabels: Record<NotificationKind, string> = {
  announcement: 'Announcement',
  alert: 'Alert',
  duty_reminder: 'Duty reminder',
  operation_update: 'Operation update',
}

export const notificationSeverityLabels: Record<NotificationSeverity, string> = {
  info: 'Information',
  success: 'Success / completion',
  warning: 'Warning / attention',
  critical: 'Critical',
}

export const notificationAudienceLabels: Record<NotificationAudience, string> = {
  org_scope: 'Entire scoped community',
  members: 'Active members',
  volunteers: 'Active volunteers',
  organization_roles: 'Organization role holders',
  finance_roles: 'Finance role holders',
  operation_participants: 'Operation participants',
  specific_users: 'Specific users',
}

export const organizationNotificationRoles = [
  'super_admin',
  'central_leadership',
  'national_operations_admin',
  'national_finance_admin',
  'provincial_coordinator',
  'divisional_coordinator',
  'district_coordinator',
  'tehsil_coordinator',
  'supervisor',
  'auditor',
] as const

export const financeNotificationRoles = ['finance_admin', 'finance_officer', 'collector', 'auditor'] as const

export function roleLabel(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function formatNotificationDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function notificationUnreadLabel(count: number) {
  if (count <= 0) return undefined
  return count > 99 ? '99+' : String(count)
}

export function severityTone(severity: NotificationSeverity) {
  switch (severity) {
    case 'critical':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    default:
      return 'border-sky-200 bg-sky-50 text-sky-800'
  }
}

export function readRate(readCount: unknown, recipientCount: unknown) {
  const read = Number(readCount ?? 0)
  const recipients = Number(recipientCount ?? 0)
  if (!Number.isFinite(read) || !Number.isFinite(recipients) || recipients <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((read / recipients) * 100)))
}
