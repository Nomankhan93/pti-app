export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type AttendanceSource = 'qr' | 'manual'

export type AttendanceOperationSummary = {
  operation_id: string
  org_unit_id: string
  org_unit_name: string
  operation_title: string
  operation_status: 'draft' | 'planned' | 'active' | 'completed' | 'cancelled'
  starts_at: string | null
  ends_at: string | null
  engaged_volunteers: number
  attendance_records: number
  present_count: number
  late_count: number
  absent_count: number
  excused_count: number
  checked_out_count: number
  active_sessions: number
}

export type AttendanceRosterRow = {
  volunteer_id: string
  full_name: string
  mobile: string
  org_unit_name: string
  is_engaged: boolean
  record_id: string | null
  status: AttendanceStatus | null
  source: AttendanceSource | null
  check_in_at: string | null
  check_out_at: string | null
  note: string | null
}

export type AttendanceSession = {
  session_id: string
  shift_id: string | null
  shift_name: string | null
  token: string | null
  opens_at: string
  closes_at: string
  late_after: string | null
  require_assignment: boolean
  is_active: boolean
  created_at: string
}

export type ParticipationHistoryRow = {
  record_id: string
  operation_id: string
  operation_title: string
  operation_kind:
    | 'long_march'
    | 'public_gathering'
    | 'convention'
    | 'membership_campaign'
    | 'fundraising_campaign'
    | 'protest'
    | 'relief_campaign'
    | 'other'
  operation_status: 'draft' | 'planned' | 'active' | 'completed' | 'cancelled'
  shift_id: string | null
  shift_name: string | null
  attendance_status: AttendanceStatus
  attendance_source: AttendanceSource
  check_in_at: string | null
  check_out_at: string | null
  note: string | null
  operation_starts_at: string | null
  operation_ends_at: string | null
}

export type ParticipationSummary = {
  operations_participated: number
  present_count: number
  late_count: number
  excused_count: number
  completed_duties: number
  total_hours: number
}

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
}

export const attendanceStatusOptions: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
]

export function attendanceRate(present: number, late: number, absent: number, excused = 0) {
  const counted = present + late + absent + excused
  if (!counted) return 0
  return Math.round(((present + late) / counted) * 100)
}

export function attendanceStatusTone(status: AttendanceStatus | null) {
  if (status === 'present') return 'emerald'
  if (status === 'late') return 'amber'
  if (status === 'absent') return 'red'
  if (status === 'excused') return 'blue'
  return 'slate'
}

export function participationHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return 0
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0
  return Math.round(((end - start) / 3_600_000) * 100) / 100
}

export function formatAttendanceDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
