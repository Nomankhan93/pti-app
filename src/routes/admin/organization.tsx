import { createFileRoute } from '@tanstack/react-router'
import { Building2, CheckCircle2, MapPin, Save, Search, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminRouteGuard } from '../../components/admin/AdminRouteGuard'
import { AdminShell } from '../../components/admin/AdminShell'
import { organizationLevelLabel, type OrganizationLevel } from '../../lib/organization'
import { supabase } from '../../lib/supabase/client'

export const Route = createFileRoute('/admin/organization')({
  component: OrganizationAdminPage,
})

type OrgUnit = {
  id: string
  parent_id: string | null
  geography_id: string | null
  level: OrganizationLevel
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const levelOrder: OrganizationLevel[] = ['central', 'province', 'division', 'district', 'tehsil']

function OrganizationAdminPage() {
  const [units, setUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState<'all' | OrganizationLevel>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)

  useEffect(() => {
    void loadUnits()
  }, [])

  async function loadUnits() {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase
      .from('organization_units')
      .select('id, parent_id, geography_id, level, name, code, is_active, created_at, updated_at')
      .order('name')

    if (loadError) setError(loadError.message)
    else setUnits((data ?? []) as OrgUnit[])
    setLoading(false)
  }

  const selected = units.find((unit) => unit.id === selectedId) ?? null

  function startEdit(unit: OrgUnit) {
    setSelectedId(unit.id)
    setEditName(unit.name)
    setEditActive(unit.is_active)
    setMessage('')
    setError('')
  }

  async function saveSelected() {
    if (!selected) return
    setSaving(true)
    setError('')
    setMessage('')

    const { error: saveError } = await supabase.rpc('save_organization_unit', {
      p_org_unit_id: selected.id,
      p_name: editName.trim(),
      p_is_active: editActive,
    })

    if (saveError) {
      setError(saveError.message)
    } else {
      setMessage('Organization unit updated and recorded in the audit log.')
      await loadUnits()
    }
    setSaving(false)
  }

  const unitById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units])

  const counts = useMemo(() => Object.fromEntries(levelOrder.map((item) => [
    item,
    units.filter((unit) => unit.level === item).length,
  ])) as Record<OrganizationLevel, number>, [units])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return units
      .filter((unit) => level === 'all' || unit.level === level)
      .filter((unit) => !query || `${unit.name} ${unit.code}`.toLowerCase().includes(query))
      .sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level) || a.name.localeCompare(b.name))
  }, [level, search, units])

  return (
    <AdminRouteGuard>
      <AdminShell
        title="PTI Organization"
        subtitle="Canonical central, province, division, district and tehsil/taluka organization hierarchy."
      >
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {levelOrder.map((item) => (
              <div key={item} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{organizationLevelLabel(item)}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{counts[item] ?? 0}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <Building2 className="h-5 w-5" />
                  <h2 className="text-lg font-black">Organization Directory</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Geography is reference data; this screen manages PTI organization-unit display names and activation state.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_190px]">
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input pl-10"
                    placeholder="Search area or code"
                  />
                </label>
                <select value={level} onChange={(event) => setLevel(event.target.value as typeof level)} className="input">
                  <option value="all">All levels</option>
                  {levelOrder.map((item) => <option key={item} value={item}>{organizationLevelLabel(item)}</option>)}
                </select>
              </div>
            </div>

            {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
            {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Parent</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Loading organization hierarchy…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No organization units match this filter.</td></tr>
                  ) : filtered.slice(0, 300).map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900">{unit.name}</div>
                        <div className="mt-0.5 font-mono text-xs text-slate-400">{unit.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{organizationLevelLabel(unit.level)}</td>
                      <td className="px-4 py-3 text-slate-600">{unit.parent_id ? unitById.get(unit.parent_id)?.name ?? '—' : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${unit.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {unit.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                          {unit.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => startEdit(unit)} className="rounded-lg px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-50">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 300 ? <p className="mt-3 text-xs font-bold text-slate-500">Showing first 300 of {filtered.length} matching units. Narrow the filter to inspect a specific area.</p> : null}
          </section>

          {selected ? (
            <section className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <MapPin className="h-5 w-5" />
                    <p className="text-xs font-black uppercase tracking-[0.2em]">Manage unit</p>
                  </div>
                  <h2 className="mt-2 text-xl font-black">{selected.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{organizationLevelLabel(selected.level)} · {selected.code}</p>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10">Close</button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <label>
                  <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">Display name</span>
                  <input value={editName} onChange={(event) => setEditName(event.target.value)} className="input bg-white text-slate-950" />
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/15 px-4 py-2">
                  <input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} />
                  <span className="text-sm font-black">Active</span>
                </label>
              </div>

              <button type="button" disabled={saving} onClick={() => void saveSelected()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save organization unit'}
              </button>
            </section>
          ) : null}
        </div>
      </AdminShell>
    </AdminRouteGuard>
  )
}
