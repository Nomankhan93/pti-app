export type ProductionAccess = {
  can_view: boolean
  can_run_checks: boolean
  can_export_audit: boolean
  can_export_finance: boolean
}

export type ProductionHealth = {
  status: 'ok' | 'warn' | 'fail'
  database_time: string
  checks: {
    rls_missing: number
    direct_write_exposure: number
    negative_finance_ledger: number
    stale_pending_finance: number
    unmapped_active_members: number
    critical_unread_deliveries: number
    legacy_public_security_definer_rpcs: number
    exports_last_24h: number
    active_rate_limit_buckets: number
  }
}

export type ProductionExportRecord = {
  id: number
  export_kind: 'audit_events' | 'finance_ledger'
  actor_id: string
  actor_email: string | null
  org_unit_id: string | null
  org_unit_name: string | null
  row_count: number
  filters: Record<string, unknown>
  created_at: string
}

export const productionCheckMeta: Array<{
  key: keyof ProductionHealth['checks']
  label: string
  ideal: number | null
  description: string
}> = [
  { key: 'rls_missing', label: 'Missing RLS', ideal: 0, description: 'Sensitive tables expected to have row-level security enabled.' },
  { key: 'direct_write_exposure', label: 'Direct write exposures', ideal: 0, description: 'Privileged ledgers/control tables writable directly by browser roles.' },
  { key: 'negative_finance_ledger', label: 'Negative finance rows', ideal: 0, description: 'Donations whose base amount plus adjustments falls below zero.' },
  { key: 'stale_pending_finance', label: 'Pending finance > 7 days', ideal: 0, description: 'Donation records still waiting for verification after seven days.' },
  { key: 'unmapped_active_members', label: 'Unmapped active members', ideal: 0, description: 'Active members not yet linked to a canonical organization unit.' },
  { key: 'critical_unread_deliveries', label: 'Unread critical alerts', ideal: null, description: 'Current critical notification deliveries that remain unread.' },
  { key: 'legacy_public_security_definer_rpcs', label: 'Legacy public definer RPCs', ideal: 0, description: 'Older authenticated SECURITY DEFINER RPCs retained from pre-wrapper modules.' },
  { key: 'exports_last_24h', label: 'Exports last 24h', ideal: null, description: 'Audited production exports generated in the last 24 hours.' },
  { key: 'active_rate_limit_buckets', label: 'Active rate buckets', ideal: null, description: 'Authenticated mutation/export rate-limit buckets active recently.' },
]

export function normalizeProductionHealth(value: unknown): ProductionHealth | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<ProductionHealth>
  if (!raw.checks || !raw.database_time || !['ok', 'warn', 'fail'].includes(String(raw.status))) return null
  const checks = raw.checks as Record<string, unknown>
  return {
    status: raw.status as ProductionHealth['status'],
    database_time: String(raw.database_time),
    checks: {
      rls_missing: Number(checks.rls_missing ?? 0),
      direct_write_exposure: Number(checks.direct_write_exposure ?? 0),
      negative_finance_ledger: Number(checks.negative_finance_ledger ?? 0),
      stale_pending_finance: Number(checks.stale_pending_finance ?? 0),
      unmapped_active_members: Number(checks.unmapped_active_members ?? 0),
      critical_unread_deliveries: Number(checks.critical_unread_deliveries ?? 0),
      legacy_public_security_definer_rpcs: Number(checks.legacy_public_security_definer_rpcs ?? 0),
      exports_last_24h: Number(checks.exports_last_24h ?? 0),
      active_rate_limit_buckets: Number(checks.active_rate_limit_buckets ?? 0),
    },
  }
}

export function csvSafeCell(value: unknown) {
  let text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Prevent spreadsheet formula injection when exported values are opened in Excel/Sheets.
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.map(csvSafeCell).join(','),
    ...rows.map((row) => headers.map((header) => csvSafeCell(row[header])).join(',')),
  ].join('\n')
}

export function safeExportFilename(kind: string, at = new Date()) {
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
  return `pti-${safeKind}-${at.toISOString().replace(/[:.]/g, '-').replace('T', '_')}.csv`
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
