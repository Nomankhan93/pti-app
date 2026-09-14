import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Flag,
  HandCoins,
  Layers3,
  Loader2,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  dateRangePreset,
  downloadTextFile,
  formatCompactNumber,
  formatLeadershipDate,
  formatLeadershipMoney,
  leadershipReportCsv,
  normalizeDashboard,
  organizationLevelLabels,
  percentage,
  toReportBounds,
  type LeadershipAccess,
  type LeadershipCampaignRow,
  type LeadershipChildRollup,
  type LeadershipDashboard,
  type LeadershipOperationRow,
  type LeadershipScopeUnit,
  type LeadershipTrendPoint,
} from '../lib/leadership'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/leadership')({ component: LeadershipMonitoringPage })

type TabKey = 'overview' | 'geography' | 'operations' | 'finance' | 'trends'

const defaultRange = dateRangePreset(30)

function LeadershipMonitoringPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [access, setAccess] = useState<LeadershipAccess | null>(null)
  const [scopes, setScopes] = useState<LeadershipScopeUnit[]>([])
  const [scopeId, setScopeId] = useState('')
  const [fromDate, setFromDate] = useState(defaultRange.from)
  const [toDate, setToDate] = useState(defaultRange.to)
  const [dashboard, setDashboard] = useState<LeadershipDashboard | null>(null)
  const [tab, setTab] = useState<TabKey>('overview')

  const loadDashboard = useCallback(async (targetScopeId: string, showSpinner = true) => {
    if (!targetScopeId) return
    if (showSpinner) setRefreshing(true)
    setError('')
    const bounds = toReportBounds(fromDate, toDate)
    if (!bounds.from || !bounds.to) {
      setError('Choose a valid reporting date range.')
      setRefreshing(false)
      return
    }

    const { data, error: rpcError } = await supabase.rpc('get_leadership_dashboard', {
      p_org_unit_id: targetScopeId,
      p_from: bounds.from,
      p_to: bounds.to,
    })

    if (rpcError) {
      setError(rpcError.message)
      setRefreshing(false)
      return
    }

    const normalized = normalizeDashboard(data)
    if (!normalized) {
      setError('Leadership analytics returned an invalid payload.')
      setRefreshing(false)
      return
    }

    setDashboard(normalized)
    setRefreshing(false)
  }, [fromDate, toDate])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      setLoading(true)
      setError('')

      const { data: sessionData } = await supabase.auth.getSession()
      if (!active) return
      if (!sessionData.session?.user) {
        setAccess({ can_view: false, default_org_unit_id: null, default_org_unit_name: null, default_org_unit_level: null })
        setLoading(false)
        return
      }

      const [{ data: accessRows, error: accessError }, { data: scopeRows, error: scopeError }] = await Promise.all([
        supabase.rpc('my_leadership_access'),
        supabase.rpc('list_leadership_scopes'),
      ])

      if (!active) return
      if (accessError) {
        setError(accessError.message)
        setLoading(false)
        return
      }
      if (scopeError) {
        setError(scopeError.message)
        setLoading(false)
        return
      }

      const accessRow = Array.isArray(accessRows) ? accessRows[0] : null
      const nextAccess: LeadershipAccess = accessRow ?? {
        can_view: false,
        default_org_unit_id: null,
        default_org_unit_name: null,
        default_org_unit_level: null,
      }
      setAccess(nextAccess)
      setScopes(Array.isArray(scopeRows) ? scopeRows : [])

      if (!nextAccess.can_view || !nextAccess.default_org_unit_id) {
        setLoading(false)
        return
      }

      setScopeId(nextAccess.default_org_unit_id)
      setLoading(false)
      await loadDashboard(nextAccess.default_org_unit_id, false)
    }

    void bootstrap()
    return () => {
      active = false
    }
  }, [])

  const scopeOptions = useMemo(() => {
    return scopes.slice().sort((a, b) => {
      const levelRank = { central: 0, province: 1, division: 2, district: 3, tehsil: 4 }
      return levelRank[a.level] - levelRank[b.level] || a.name.localeCompare(b.name)
    })
  }, [scopes])

  function applyPreset(days: number) {
    const range = dateRangePreset(days)
    setFromDate(range.from)
    setToDate(range.to)
  }

  async function drillTo(id: string) {
    setScopeId(id)
    setTab('overview')
    await loadDashboard(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function exportReport() {
    if (!dashboard) return
    const safeName = dashboard.scope.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scope'
    downloadTextFile(`pti-leadership-${safeName}-${fromDate}-${toDate}.csv`, leadershipReportCsv(dashboard))
  }

  if (loading) {
    return <CenteredState icon={<Loader2 className="h-8 w-8 animate-spin" />} title="Loading leadership monitoring" description="Checking your organization scope and analytics access." />
  }

  if (!access?.can_view) {
    return (
      <CenteredState
        icon={<ShieldCheck className="h-9 w-9" />}
        title="Leadership access required"
        description="This dashboard is limited to authorized Central, Province, Division, District and Tehsil leadership roles."
        action={<Link to="/dashboard" className="rounded-xl bg-emerald-950 px-4 py-2 text-sm font-bold text-white">Back to dashboard</Link>}
      />
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-emerald-950/10 bg-white/95 shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-950 px-5 py-6 text-white sm:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">Phase 6</span>
                <span>Leadership Monitoring</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">PTI Leadership Command Dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50/85">
                Central-to-Tehsil visibility across membership, volunteers, operations, participation and finance — with organization-scoped drill-down reporting.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => scopeId && void loadDashboard(scopeId)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button onClick={exportReport} disabled={!dashboard} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-emerald-950 hover:bg-emerald-50 disabled:opacity-60">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-slate-50/80 p-5 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.3fr)_repeat(2,minmax(180px,.75fr))_auto] sm:p-6">
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Organization scope
            <select value={scopeId} onChange={(event) => { const id = event.target.value; setScopeId(id); void loadDashboard(id) }} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-emerald-700">
              {scopeOptions.map((scope) => <option key={scope.id} value={scope.id}>{organizationLevelLabels[scope.level]} · {scope.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            From
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-emerald-700" />
          </label>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            To
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-slate-900 outline-none focus:border-emerald-700" />
          </label>
          <div className="flex items-end gap-2">
            <button onClick={() => void loadDashboard(scopeId)} className="rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-900">Apply</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3 sm:px-6">
          {[7, 30, 90, 365].map((days) => (
            <button key={days} onClick={() => applyPreset(days)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-900">
              {days === 365 ? '1 year' : `${days} days`}
            </button>
          ))}
        </div>
      </section>

      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}

      {dashboard ? (
        <>
          <Breadcrumbs dashboard={dashboard} onDrill={drillTo} />
          <DashboardTabs tab={tab} setTab={setTab} />
          {tab === 'overview' ? <Overview dashboard={dashboard} onDrill={drillTo} /> : null}
          {tab === 'geography' ? <GeographyRollup rows={dashboard.children} onDrill={drillTo} /> : null}
          {tab === 'operations' ? <OperationsReport rows={dashboard.operations} /> : null}
          {tab === 'finance' ? <FinanceReport dashboard={dashboard} /> : null}
          {tab === 'trends' ? <TrendsReport rows={dashboard.trends} /> : null}
        </>
      ) : null}
    </main>
  )
}

function Breadcrumbs({ dashboard, onDrill }: { dashboard: LeadershipDashboard; onDrill: (id: string) => void }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
      {dashboard.path.map((item, index) => (
        <span key={item.id} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-4 w-4 text-slate-400" /> : null}
          <button onClick={() => void onDrill(item.id)} className={`rounded-lg px-2 py-1 font-bold hover:bg-emerald-50 hover:text-emerald-900 ${item.id === dashboard.scope.id ? 'bg-emerald-50 text-emerald-950' : ''}`}>
            {item.name}
          </button>
        </span>
      ))}
    </div>
  )
}

function DashboardTabs({ tab, setTab }: { tab: TabKey; setTab: (tab: TabKey) => void }) {
  const items: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'geography', label: 'Geography', icon: <MapPinned className="h-4 w-4" /> },
    { key: 'operations', label: 'Operations', icon: <Flag className="h-4 w-4" /> },
    { key: 'finance', label: 'Finance', icon: <HandCoins className="h-4 w-4" /> },
    { key: 'trends', label: 'Trends', icon: <TrendingUp className="h-4 w-4" /> },
  ]
  return (
    <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {items.map((item) => (
        <button key={item.key} onClick={() => setTab(item.key)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${tab === item.key ? 'bg-emerald-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          {item.icon}{item.label}
        </button>
      ))}
    </div>
  )
}

function Overview({ dashboard, onDrill }: { dashboard: LeadershipDashboard; onDrill: (id: string) => void }) {
  const k = dashboard.kpis
  const dutyCompletion = percentage(k.duties_completed, k.duties_assigned)
  const attendanceDenominator = k.attendance_present + k.attendance_late + k.attendance_absent
  const participation = percentage(k.attendance_present + k.attendance_late, attendanceDenominator)
  const pkr = k.finance_by_currency.PKR

  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Users />} label="Active members" value={formatCompactNumber(k.members_active)} note={`${formatCompactNumber(k.members_new)} joined in period`} />
        <KpiCard icon={<UsersRound />} label="Active volunteers" value={formatCompactNumber(k.volunteers_active)} note={`${formatCompactNumber(k.volunteers_available)} currently available`} />
        <KpiCard icon={<Flag />} label="Active operations" value={formatCompactNumber(k.operations_active)} note={`${formatCompactNumber(k.operations_completed)} completed in period`} />
        <KpiCard icon={<UserCheck />} label="Participation rate" value={`${participation}%`} note={`${formatCompactNumber(k.attendance_present + k.attendance_late)} attended / checked in`} />
        <KpiCard icon={<CheckCircle2 />} label="Duty completion" value={`${dutyCompletion}%`} note={`${formatCompactNumber(k.duties_completed)} of ${formatCompactNumber(k.duties_assigned)} assignments`} />
        <KpiCard icon={<Target />} label="Active campaigns" value={formatCompactNumber(k.active_campaigns)} note={`${formatCompactNumber(k.donations_count)} donations in period`} />
        <KpiCard icon={<CircleDollarSign />} label="Verified PKR" value={formatLeadershipMoney(pkr?.verified_total ?? 0)} note={`${formatLeadershipMoney(pkr?.reconciled_total ?? 0)} reconciled`} />
        <KpiCard icon={<Layers3 />} label="Reporting scope" value={organizationLevelLabels[dashboard.scope.level]} note={dashboard.scope.name} />
      </div>

      {k.members_unmapped > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{k.members_unmapped.toLocaleString('en-PK')} legacy members</strong> are not yet mapped to a canonical Tehsil organization unit. They are excluded from geographic drill-down until corrected.
        </div>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading icon={<Building2 />} title="Organization drill-down" description="Move from the current scope into its immediate geographic child units." />
        {dashboard.children.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.children.slice(0, 9).map((child) => <ChildCard key={child.id} row={child} onDrill={onDrill} />)}
          </div>
        ) : <EmptyState text="This is the lowest organization level; no child units are available." />}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading icon={<Activity />} title="Recent operational picture" description="Latest operations touching this reporting period." />
          <div className="mt-4 space-y-3">
            {dashboard.operations.slice(0, 5).map((row) => <OperationCompact key={row.id} row={row} />)}
            {!dashboard.operations.length ? <EmptyState text="No operations in this reporting window." /> : null}
          </div>
        </section>
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading icon={<HandCoins />} title="Fundraising picture" description="Campaign performance without exposing donor PII." />
          <div className="mt-4 space-y-3">
            {dashboard.campaigns.slice(0, 5).map((row) => <CampaignCompact key={row.id} row={row} />)}
            {!dashboard.campaigns.length ? <EmptyState text="No fundraising campaigns in this reporting window." /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}

function GeographyRollup({ rows, onDrill }: { rows: LeadershipChildRollup[]; onDrill: (id: string) => void }) {
  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6"><SectionHeading icon={<MapPinned />} title="Geographic performance" description="Comparable organization metrics for the next level down." /></div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Unit</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Volunteers</th><th className="px-4 py-3">Active ops</th><th className="px-4 py-3">Participation</th><th className="px-4 py-3">Verified PKR</th><th className="px-4 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={row.id} className="hover:bg-emerald-50/30"><td className="px-5 py-4"><div className="font-black text-slate-900">{row.name}</div><div className="text-xs text-slate-500">{organizationLevelLabels[row.level]}</div></td><td className="px-4 py-4 font-bold">{row.members.toLocaleString('en-PK')}</td><td className="px-4 py-4 font-bold">{row.volunteers.toLocaleString('en-PK')}</td><td className="px-4 py-4 font-bold">{row.active_operations.toLocaleString('en-PK')}</td><td className="px-4 py-4 font-bold">{row.participation.toLocaleString('en-PK')}</td><td className="px-4 py-4 font-bold">{formatLeadershipMoney(row.verified_pkr)}</td><td className="px-4 py-4"><button onClick={() => void onDrill(row.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-950 px-3 py-1.5 text-xs font-black text-white">Drill down <ChevronRight className="h-3.5 w-3.5" /></button></td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <div className="p-6"><EmptyState text="No child organization units under this scope." /></div>}
    </section>
  )
}

function OperationsReport({ rows }: { rows: LeadershipOperationRow[] }) {
  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="p-5 sm:p-6"><SectionHeading icon={<Flag />} title="Operations report" description="Operation execution, duty completion and field participation across the selected hierarchy." /></div>
      {rows.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Operation</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Duties</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Participants</th><th className="px-4 py-3">Starts</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4"><div className="font-black text-slate-900">{row.title}</div><div className="text-xs text-slate-500">{row.kind.replaceAll('_', ' ')}</div></td><td className="px-4 py-4">{row.org_unit_name}</td><td className="px-4 py-4"><StatusPill text={row.status} /></td><td className="px-4 py-4 font-bold">{row.duties}</td><td className="px-4 py-4 font-bold">{row.completed_duties}</td><td className="px-4 py-4 font-bold">{row.participants}</td><td className="px-4 py-4">{formatLeadershipDate(row.starts_at)}</td></tr>)}</tbody></table></div> : <div className="p-6"><EmptyState text="No operations match this reporting period." /></div>}
    </section>
  )
}

function FinanceReport({ dashboard }: { dashboard: LeadershipDashboard }) {
  const currencies = Object.entries(dashboard.kpis.finance_by_currency)
  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading icon={<CircleDollarSign />} title="Finance by currency" description="Currencies are reported independently; totals are never incorrectly mixed across currencies." />
        {currencies.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{currencies.map(([currency, values]) => <div key={currency} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="text-xs font-black uppercase tracking-wider text-slate-500">{currency}</div><div className="mt-2 text-xl font-black text-slate-950">{formatLeadershipMoney(values.verified_total, currency)}</div><div className="mt-1 text-xs text-slate-500">Verified · {values.donation_count.toLocaleString('en-PK')} donations</div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><div className="text-slate-500">Effective</div><div className="font-bold">{formatLeadershipMoney(values.effective_total, currency)}</div></div><div><div className="text-slate-500">Reconciled</div><div className="font-bold">{formatLeadershipMoney(values.reconciled_total, currency)}</div></div></div></div>)}</div> : <div className="mt-5"><EmptyState text="No donations in the selected reporting period." /></div>}
      </section>
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6"><SectionHeading icon={<Target />} title="Campaign reporting" description="Scoped campaign targets, effective collection, verification and reconciliation." /></div>
        {dashboard.campaigns.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Campaign</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Donations</th><th className="px-4 py-3">Verified</th><th className="px-4 py-3">Reconciled</th><th className="px-4 py-3">Target</th></tr></thead><tbody className="divide-y divide-slate-100">{dashboard.campaigns.map((row) => <tr key={row.id}><td className="px-5 py-4"><div className="font-black">{row.title}</div><div className="text-xs text-slate-500">{row.campaign_no}</div></td><td className="px-4 py-4">{row.org_unit_name}</td><td className="px-4 py-4"><StatusPill text={row.status} /></td><td className="px-4 py-4 font-bold">{row.donation_count}</td><td className="px-4 py-4 font-bold">{formatLeadershipMoney(row.verified_total, row.currency)}</td><td className="px-4 py-4 font-bold">{formatLeadershipMoney(row.reconciled_total, row.currency)}</td><td className="px-4 py-4">{row.target_amount ? formatLeadershipMoney(row.target_amount, row.currency) : '—'}</td></tr>)}</tbody></table></div> : <div className="p-6"><EmptyState text="No campaigns match this reporting period." /></div>}
      </section>
    </div>
  )
}

function TrendsReport({ rows }: { rows: LeadershipTrendPoint[] }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.members, row.volunteers, row.operations, row.participation, row.donations)))
  return (
    <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading icon={<TrendingUp />} title="Trend analytics" description="New membership, volunteer growth, operations, field participation and donation activity over time." />
      {rows.length ? <div className="mt-6 space-y-4">{rows.map((row) => <div key={row.bucket} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 lg:grid-cols-[150px_1fr]"><div><div className="font-black text-slate-900">{formatLeadershipDate(row.bucket)}</div><div className="text-xs text-slate-500">{formatLeadershipMoney(row.verified_pkr)} verified</div></div><div className="grid gap-2 sm:grid-cols-5"><TrendBar label="Members" value={row.members} max={max} /><TrendBar label="Volunteers" value={row.volunteers} max={max} /><TrendBar label="Operations" value={row.operations} max={max} /><TrendBar label="Participation" value={row.participation} max={max} /><TrendBar label="Donations" value={row.donations} max={max} /></div></div>)}</div> : <div className="mt-5"><EmptyState text="No trend activity in this reporting period." /></div>}
    </section>
  )
}

function KpiCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div></div><div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-900">{icon}</div></div><div className="mt-3 text-xs font-semibold text-slate-500">{note}</div></div>
}

function ChildCard({ row, onDrill }: { row: LeadershipChildRollup; onDrill: (id: string) => void }) {
  return <button onClick={() => void onDrill(row.id)} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-wider text-slate-500">{organizationLevelLabels[row.level]}</div><div className="mt-1 font-black text-slate-950">{row.name}</div></div><ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:text-emerald-900" /></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><div className="text-slate-500">Members</div><div className="font-black">{formatCompactNumber(row.members)}</div></div><div><div className="text-slate-500">Volunteers</div><div className="font-black">{formatCompactNumber(row.volunteers)}</div></div><div><div className="text-slate-500">Active ops</div><div className="font-black">{formatCompactNumber(row.active_operations)}</div></div></div></button>
}

function OperationCompact({ row }: { row: LeadershipOperationRow }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-slate-900">{row.title}</div><div className="mt-1 text-xs text-slate-500">{row.org_unit_name} · {formatLeadershipDate(row.starts_at)}</div></div><StatusPill text={row.status} /></div><div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600"><span>{row.completed_duties}/{row.duties} duties</span><span>{row.participants} participants</span></div></div>
}

function CampaignCompact({ row }: { row: LeadershipCampaignRow }) {
  const progress = row.target_amount ? percentage(row.verified_total, row.target_amount) : 0
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-black text-slate-900">{row.title}</div><div className="mt-1 text-xs text-slate-500">{row.org_unit_name} · {row.campaign_no}</div></div><StatusPill text={row.status} /></div><div className="mt-3 flex items-end justify-between gap-3"><div><div className="text-xs text-slate-500">Verified</div><div className="font-black">{formatLeadershipMoney(row.verified_total, row.currency)}</div></div>{row.target_amount ? <div className="text-right"><div className="text-xs text-slate-500">Target progress</div><div className="font-black">{progress}%</div></div> : null}</div></div>
}

function TrendBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100))
  return <div><div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate-500"><span>{label}</span><span>{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-800" style={{ width: `${width}%` }} /></div></div>
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-50 p-2 text-emerald-900">{icon}</div><div><h2 className="font-black text-slate-950">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>
}

function StatusPill({ text }: { text: string }) {
  return <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700">{text.replaceAll('_', ' ')}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">{text}</div>
}

function CenteredState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-12"><div className="w-full rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-900">{icon}</div><h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div></main>
}
