import { createFileRoute } from '@tanstack/react-router'
import { Activity, Database, Download, RefreshCw, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminRouteGuard } from '../../components/admin/AdminRouteGuard'
import { AdminShell } from '../../components/admin/AdminShell'
import {
  downloadCsv,
  normalizeProductionHealth,
  productionCheckMeta,
  rowsToCsv,
  safeExportFilename,
  type ProductionAccess,
  type ProductionExportRecord,
  type ProductionHealth,
} from '../../lib/production'
import { supabase } from '../../lib/supabase/client'

export const Route = createFileRoute('/admin/production')({
  component: ProductionReadinessPage,
})

type OrgUnit = { id: string; name: string; level: string }

const statusClasses: Record<ProductionHealth['status'], string> = {
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warn: 'bg-amber-50 text-amber-800 ring-amber-200',
  fail: 'bg-red-50 text-red-800 ring-red-200',
}

function toBound(value: string, end = false) {
  if (!value) return null
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function ProductionReadinessPage() {
  const [access, setAccess] = useState<ProductionAccess | null>(null)
  const [health, setHealth] = useState<ProductionHealth | null>(null)
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [exports, setExports] = useState<ProductionExportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'audit' | 'finance' | null>(null)
  const [error, setError] = useState('')
  const [scope, setScope] = useState('')
  const [from, setFrom] = useState(() => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return date.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [limit, setLimit] = useState(1000)

  useEffect(() => {
    void loadPage()
  }, [])

  async function loadPage() {
    setLoading(true)
    setError('')
    const accessResult = await (supabase as any).rpc('my_production_readiness_access')
    if (accessResult.error) {
      setError(accessResult.error.message)
      setLoading(false)
      return
    }
    const nextAccess = (accessResult.data?.[0] ?? null) as ProductionAccess | null
    setAccess(nextAccess)
    if (!nextAccess?.can_view) {
      setError('Production readiness access is not assigned to this account.')
      setLoading(false)
      return
    }

    const [healthResult, exportResult, unitResult] = await Promise.all([
      (supabase as any).rpc('production_health_summary'),
      (supabase as any).rpc('list_production_exports', { p_limit: 50 }),
      supabase.from('organization_units').select('id,name,level').eq('is_active', true).order('name'),
    ])
    const firstError = healthResult.error ?? exportResult.error ?? unitResult.error
    if (firstError) setError(firstError.message)
    else {
      setHealth(normalizeProductionHealth(healthResult.data))
      setExports((exportResult.data ?? []) as ProductionExportRecord[])
      setUnits((unitResult.data ?? []) as OrgUnit[])
    }
    setLoading(false)
  }

  async function runExport(kind: 'audit' | 'finance') {
    if (!access) return
    if (kind === 'audit' && !access.can_export_audit) return
    if (kind === 'finance' && !access.can_export_finance) return
    setExporting(kind)
    setError('')
    const fn = kind === 'audit' ? 'production_export_audit_events' : 'production_export_finance_ledger'
    const { data, error: rpcError } = await (supabase as any).rpc(fn, {
      p_org_unit_id: scope || null,
      p_from: toBound(from),
      p_to: toBound(to, true),
      p_limit: Math.max(1, Math.min(limit || 1000, 5000)),
    })
    if (rpcError) setError(rpcError.message)
    else {
      const rows = (data ?? []) as Array<Record<string, unknown>>
      downloadCsv(safeExportFilename(kind === 'audit' ? 'audit-events' : 'finance-ledger'), rowsToCsv(rows))
      await loadPage()
    }
    setExporting(null)
  }

  const scopeName = useMemo(() => units.find((unit) => unit.id === scope)?.name ?? 'All authorized scopes', [scope, units])

  return (
    <AdminRouteGuard>
      <AdminShell
        title="Production Readiness"
        subtitle="Security posture, ledger integrity, operational monitoring and audited release exports."
      >
        <div className="space-y-5">
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <ShieldCheck className="h-5 w-5" />
                  <h2 className="text-lg font-black">Production health</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">Live database posture. Full release SQL QA and backup drills remain command-line gates.</p>
              </div>
              <div className="flex items-center gap-2">
                {health ? (
                  <span className={`rounded-full px-3 py-1.5 text-xs font-black uppercase ring-1 ${statusClasses[health.status]}`}>
                    {health.status}
                  </span>
                ) : null}
                <button type="button" onClick={() => void loadPage()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
              </div>
            </div>

            {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
            {loading ? <p className="mt-5 text-sm font-bold text-slate-500">Loading production checks…</p> : null}

            {health ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {productionCheckMeta.map((item) => {
                  const value = health.checks[item.key]
                  const bad = item.ideal === 0 && value !== 0
                  return (
                    <article key={item.key} className={`rounded-2xl border p-4 ${bad ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/60'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</p>
                          <p className="mt-2 text-2xl font-black text-slate-950">{value.toLocaleString()}</p>
                        </div>
                        <Activity className={`h-5 w-5 ${bad ? 'text-amber-600' : 'text-emerald-700'}`} />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                    </article>
                  )
                })}
              </div>
            ) : null}
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex items-center gap-2 text-emerald-800">
              <Download className="h-5 w-5" />
              <h2 className="text-lg font-black">Audited exports</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Exports are rate-limited and written to the production export ledger. Finance export excludes donor PII by design.</p>

            <div className="mt-5 grid gap-3 lg:grid-cols-5">
              <label className="lg:col-span-2">
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Organization scope</span>
                <select className="input" value={scope} onChange={(event) => setScope(event.target.value)}>
                  <option value="">All authorized scopes</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} · {unit.level}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">From</span>
                <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">To</span>
                <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Max rows</span>
                <input className="input" type="number" min={1} max={5000} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={!access?.can_export_audit || exporting !== null} onClick={() => void runExport('audit')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                <Download className="h-4 w-4" /> {exporting === 'audit' ? 'Exporting…' : 'Export Audit Events'}
              </button>
              <button disabled={!access?.can_export_finance || exporting !== null} onClick={() => void runExport('finance')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                <Database className="h-4 w-4" /> {exporting === 'finance' ? 'Exporting…' : 'Export Finance Ledger'}
              </button>
              <span className="self-center text-xs font-bold text-slate-400">Scope: {scopeName}</span>
            </div>
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <h2 className="text-lg font-black text-slate-900">Recent export ledger</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Rows</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exports.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No production exports recorded yet.</td></tr>
                  ) : exports.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-500">{new Date(item.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 font-black text-slate-900">{item.export_kind.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-600">{item.actor_email ?? item.actor_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-600">{item.org_unit_name ?? 'All authorized'}</td>
                      <td className="px-4 py-3 font-black text-slate-900">{item.row_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminRouteGuard>
  )
}
