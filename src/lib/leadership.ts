export type OrganizationLevel = 'central' | 'province' | 'division' | 'district' | 'tehsil'

export type LeadershipAccess = {
  can_view: boolean
  default_org_unit_id: string | null
  default_org_unit_name: string | null
  default_org_unit_level: OrganizationLevel | null
}

export type LeadershipScopeUnit = {
  id: string
  parent_id: string | null
  level: OrganizationLevel
  name: string
  code: string
  depth: number
}

export type LeadershipPathItem = Pick<LeadershipScopeUnit, 'id' | 'name' | 'level' | 'code'>

export type FinanceCurrencyKpi = {
  donation_count: number
  effective_total: number
  verified_total: number
  reconciled_total: number
}

export type LeadershipKpis = {
  members_active: number
  members_new: number
  members_unmapped: number
  volunteers_active: number
  volunteers_available: number
  volunteers_new: number
  operations_active: number
  operations_created: number
  operations_completed: number
  duties_assigned: number
  duties_completed: number
  attendance_present: number
  attendance_late: number
  attendance_absent: number
  attendance_excused: number
  active_campaigns: number
  donations_count: number
  finance_by_currency: Record<string, FinanceCurrencyKpi>
}

export type LeadershipChildRollup = {
  id: string
  name: string
  level: OrganizationLevel
  code: string
  members: number
  volunteers: number
  active_operations: number
  participation: number
  verified_pkr: number
}

export type LeadershipTrendPoint = {
  bucket: string
  members: number
  volunteers: number
  operations: number
  participation: number
  donations: number
  verified_pkr: number
}

export type LeadershipOperationRow = {
  id: string
  title: string
  kind: string
  status: string
  starts_at: string | null
  ends_at: string | null
  created_at: string
  org_unit_name: string
  duties: number
  completed_duties: number
  participants: number
}

export type LeadershipCampaignRow = {
  id: string
  campaign_no: string
  title: string
  status: string
  currency: string
  target_amount: number | null
  created_at: string
  org_unit_name: string
  donation_count: number
  effective_total: number
  verified_total: number
  reconciled_total: number
}

export type LeadershipDashboard = {
  scope: {
    id: string
    parent_id: string | null
    name: string
    level: OrganizationLevel
    code: string
    from: string
    to: string
    bucket: 'day' | 'week' | 'month'
  }
  path: LeadershipPathItem[]
  kpis: LeadershipKpis
  children: LeadershipChildRollup[]
  trends: LeadershipTrendPoint[]
  operations: LeadershipOperationRow[]
  campaigns: LeadershipCampaignRow[]
}

export const organizationLevelLabels: Record<OrganizationLevel, string> = {
  central: 'Central',
  province: 'Province / Territory',
  division: 'Division',
  district: 'District',
  tehsil: 'Tehsil / Taluka',
}

export function asNumber(value: unknown) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

export function formatCompactNumber(value: unknown) {
  return new Intl.NumberFormat('en-PK', { notation: 'compact', maximumFractionDigits: 1 }).format(asNumber(value))
}

export function formatLeadershipMoney(value: unknown, currency = 'PKR') {
  const amount = asNumber(value)
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`
  }
}

export function formatLeadershipDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(date)
}

export function percentage(numerator: unknown, denominator: unknown) {
  const top = asNumber(numerator)
  const bottom = asNumber(denominator)
  if (bottom <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((top / bottom) * 100)))
}

export function dateRangePreset(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export function toReportBounds(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`)
  const to = new Date(`${toDate}T23:59:59.999`)
  return {
    from: Number.isNaN(from.getTime()) ? null : from.toISOString(),
    to: Number.isNaN(to.getTime()) ? null : to.toISOString(),
  }
}

export function normalizeDashboard(value: unknown): LeadershipDashboard | null {
  if (!value || typeof value !== 'object') return null
  const data = value as LeadershipDashboard
  if (!data.scope?.id || !data.kpis) return null
  return {
    ...data,
    path: Array.isArray(data.path) ? data.path : [],
    children: Array.isArray(data.children) ? data.children : [],
    trends: Array.isArray(data.trends) ? data.trends : [],
    operations: Array.isArray(data.operations) ? data.operations : [],
    campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
    kpis: {
      ...data.kpis,
      finance_by_currency: data.kpis.finance_by_currency && typeof data.kpis.finance_by_currency === 'object'
        ? data.kpis.finance_by_currency
        : {},
    },
  }
}

export function leadershipReportCsv(dashboard: LeadershipDashboard) {
  const rows: Array<Array<string | number>> = [
    ['PTI Leadership Monitoring Report'],
    ['Scope', dashboard.scope.name],
    ['Level', organizationLevelLabels[dashboard.scope.level]],
    ['From', dashboard.scope.from],
    ['To', dashboard.scope.to],
    [],
    ['KPI', 'Value'],
    ['Active members', dashboard.kpis.members_active],
    ['New members', dashboard.kpis.members_new],
    ['Active volunteers', dashboard.kpis.volunteers_active],
    ['Available volunteers', dashboard.kpis.volunteers_available],
    ['Active operations', dashboard.kpis.operations_active],
    ['Completed operations', dashboard.kpis.operations_completed],
    ['Duties completed', dashboard.kpis.duties_completed],
    ['Attendance present', dashboard.kpis.attendance_present],
    ['Attendance late', dashboard.kpis.attendance_late],
    ['Donation records', dashboard.kpis.donations_count],
    [],
    ['Child scope', 'Level', 'Members', 'Volunteers', 'Active operations', 'Participation', 'Verified PKR'],
    ...dashboard.children.map((row) => [row.name, organizationLevelLabels[row.level], row.members, row.volunteers, row.active_operations, row.participation, row.verified_pkr]),
  ]

  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  return rows.map((row) => row.map(escape).join(',')).join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
