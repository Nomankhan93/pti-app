import { createFileRoute } from '@tanstack/react-router'
import { Activity, RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminRouteGuard } from '../../components/admin/AdminRouteGuard'
import { AdminShell } from '../../components/admin/AdminShell'
import { supabase } from '../../lib/supabase/client'

export const Route = createFileRoute('/admin/audit')({
  component: AuditAdminPage,
})

type AuditEvent = {
  id: number
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  org_unit_id: string | null
  detail: Record<string, unknown>
  created_at: string
}

type Profile = { id: string; email: string | null }
type OrgUnit = { id: string; name: string }

function formatAction(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function AuditAdminPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    void loadAudit()
  }, [])

  async function loadAudit() {
    setLoading(true)
    setError('')
    const [eventResult, profileResult, unitResult] = await Promise.all([
      supabase.from('audit_events').select('id, actor_id, action, entity_type, entity_id, org_unit_id, detail, created_at').order('created_at', { ascending: false }).limit(250),
      supabase.from('profiles').select('id, email'),
      supabase.from('organization_units').select('id, name'),
    ])
    const firstError = eventResult.error ?? profileResult.error ?? unitResult.error
    if (firstError) setError(firstError.message)
    else {
      setEvents((eventResult.data ?? []) as AuditEvent[])
      setProfiles((profileResult.data ?? []) as Profile[])
      setUnits((unitResult.data ?? []) as OrgUnit[])
    }
    setLoading(false)
  }

  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles])
  const unitById = useMemo(() => new Map(units.map((item) => [item.id, item])), [units])
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return events
    return events.filter((event) => {
      const actor = event.actor_id ? profileById.get(event.actor_id)?.email ?? event.actor_id : 'system'
      const scope = event.org_unit_id ? unitById.get(event.org_unit_id)?.name ?? '' : ''
      return `${event.action} ${event.entity_type} ${actor} ${scope} ${JSON.stringify(event.detail)}`.toLowerCase().includes(query)
    })
  }, [events, profileById, search, unitById])

  return (
    <AdminRouteGuard>
      <AdminShell title="Audit Log" subtitle="Append-only operational foundation log for organization and role-management activity.">
        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-800">
                <Activity className="h-5 w-5" />
                <h2 className="text-lg font-black">Security & organization activity</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Latest 250 visible audit events. Direct update/delete access is not granted to application users.</p>
            </div>
            <div className="flex gap-2">
              <label className="relative min-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="input pl-10" placeholder="Search audit log" />
              </label>
              <button type="button" onClick={() => void loadAudit()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading audit events…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No audit events match this search.</td></tr>
                ) : filtered.map((event) => (
                  <tr key={event.id} className="align-top hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-slate-500">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-900">{formatAction(event.action)}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{event.entity_type}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{event.actor_id ? profileById.get(event.actor_id)?.email ?? event.actor_id.slice(0, 8) : 'System'}</td>
                    <td className="px-4 py-3 font-bold text-slate-600">{event.org_unit_id ? unitById.get(event.org_unit_id)?.name ?? 'Unknown scope' : '—'}</td>
                    <td className="max-w-[420px] px-4 py-3">
                      <code className="block whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">{JSON.stringify(event.detail)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AdminShell>
    </AdminRouteGuard>
  )
}
