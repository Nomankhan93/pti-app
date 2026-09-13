import type { Database, Tables } from './supabase/database.types'

export type Operation = Tables<'operations'>
export type OperationTeam = Tables<'operation_teams'>
export type OperationShift = Tables<'operation_shifts'>
export type OperationDuty = Tables<'operation_duties'>
export type OperationTeamMember = Tables<'operation_team_members'>
export type DutyAssignment = Tables<'duty_assignments'>
export type OperationCoordinator = Tables<'operation_coordinators'>

export type OperationKind = Database['public']['Enums']['operation_kind']
export type OperationStatus = Database['public']['Enums']['operation_status']
export type DutyPriority = Database['public']['Enums']['duty_priority']
export type DutyStatus = Database['public']['Enums']['duty_status']
export type OperationCoordinatorRole = Database['public']['Enums']['operation_coordinator_role']

export type OperationSummary = {
  id: string
  org_unit_id: string
  org_unit_name: string
  org_level: Database['public']['Enums']['organization_level']
  kind: OperationKind
  title: string
  description: string | null
  location: string | null
  starts_at: string | null
  ends_at: string | null
  status: OperationStatus
  team_count: number
  shift_count: number
  duty_count: number
  assignment_count: number
  completed_count: number
  created_at: string
  updated_at: string
}

export type MyDutyAssignment = {
  assignment_id: string
  duty_id: string
  operation_id: string
  operation_title: string
  operation_status: OperationStatus
  team_name: string | null
  shift_name: string | null
  duty_title: string
  instructions: string | null
  location: string | null
  priority: DutyPriority
  starts_at: string | null
  ends_at: string | null
  status: DutyStatus
  response_note: string | null
  assigned_at: string
  responded_at: string | null
  started_at: string | null
  completed_at: string | null
}

export const operationKindOptions: Array<{ value: OperationKind; label: string }> = [
  { value: 'long_march', label: 'Long March' },
  { value: 'public_gathering', label: 'Public Gathering' },
  { value: 'convention', label: 'Convention' },
  { value: 'membership_campaign', label: 'Membership Campaign' },
  { value: 'fundraising_campaign', label: 'Fundraising Campaign' },
  { value: 'protest', label: 'Protest' },
  { value: 'relief_campaign', label: 'Relief Campaign' },
  { value: 'other', label: 'Other Operation' },
]

export const operationStatusOptions: Array<{ value: OperationStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const dutyPriorityOptions: Array<{ value: DutyPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const dutyStatusLabels: Record<DutyStatus, string> = {
  assigned: 'Assigned',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  unable: 'Unable to Attend',
  cancelled: 'Cancelled',
}

export const operationStatusLabels: Record<OperationStatus, string> = Object.fromEntries(
  operationStatusOptions.map((item) => [item.value, item.label]),
) as Record<OperationStatus, string>

export const operationKindLabels: Record<OperationKind, string> = Object.fromEntries(
  operationKindOptions.map((item) => [item.value, item.label]),
) as Record<OperationKind, string>

export function dutyNextActions(status: DutyStatus): DutyStatus[] {
  if (status === 'assigned') return ['accepted', 'unable']
  if (status === 'accepted') return ['in_progress', 'unable']
  if (status === 'in_progress') return ['completed', 'unable']
  return []
}

export function completionPercent(completed: number, total: number) {
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

export function formatOperationDate(value: string | null) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not scheduled'
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

export function fromDateTimeLocal(value: string) {
  if (!value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
