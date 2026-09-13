import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  BadgeCheck,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import {
  capabilityLabels,
  geographyPath,
  type GeographyRow,
  type OrganizationUnitRow,
  type VolunteerAvailability,
  type VolunteerDirectoryRow,
} from '../../lib/volunteers'

export const Route = createFileRoute('/operations/volunteers')({ component: VolunteerWorkbenchPage })

type WorkbenchAccess = { can_view: boolean; can_manage: boolean }

function VolunteerWorkbenchPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [access, setAccess] = useState<WorkbenchAccess>({ can_view: false, can_manage: false })
  const [profiles, setProfiles] = useState<VolunteerDirectoryRow[]>([])
  const [geographies, setGeographies] = useState<GeographyRow[]>([])
  const [orgUnits, setOrgUnits] = useState<OrganizationUnitRow[]>([])
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState<'all' | VolunteerAvailability>('all')
  const [stateFilter, setStateFilter] = useState<'all' | 'active' | 'inactive'>('active')

  useEffect(() => {
    void loadWorkbench()
  }, [])

  async function loadWorkbench() {
    setLoading(true)
    setError('')

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      void navigate({ to: '/login' })
      return
    }

    const { data: accessRows, error: accessError } = await supabase.rpc('my_volunteer_workbench_access')
    if (accessError) {
      setError(accessError.message)
      setLoading(false)
      return
    }

    const nextAccess = ((accessRows ?? [])[0] ?? { can_view: false, can_manage: false }) as WorkbenchAccess
    setAccess(nextAccess)
    if (!nextAccess.can_view) {
      setLoading(false)
      return
    }

    const [profileResult, geographyResult, orgResult] = await Promise.all([
      supabase.rpc('list_volunteers_for_my_scope'),
      supabase.from('geographies').select('*').order('name'),
      supabase.from('organization_units').select('*').order('name'),
    ])

    const firstError = profileResult.error ?? geographyResult.error ?? orgResult.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setProfiles((profileResult.data ?? []) as VolunteerDirectoryRow[])
    setGeographies((geographyResult.data ?? []) as GeographyRow[])
    setOrgUnits((orgResult.data ?? []) as OrganizationUnitRow[])
    setLoading(false)
  }

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLowerCase()
    return profiles.filter((profile) => {
      if (availability !== 'all' && profile.availability !== availability) return false
      if (stateFilter === 'active' && !profile.is_active) return false
      if (stateFilter === 'inactive' && profile.is_active) return false
      if (!term) return true
      const haystack = [
        profile.full_name,
        profile.mobile,
        profile.profession ?? '',
        profile.education ?? '',
        ...profile.skills,
        ...profile.languages,
        ...profile.preferred_duties,
        geographyPath(geographies, profile.geography_id),
      ].join(' ').toLowerCase()
      return haystack.includes(term)
    })
  }, [availability, geographies, profiles, search, stateFilter])

  const activeCount = profiles.filter((profile) => profile.is_active).length
  const availableCount = profiles.filter((profile) => profile.is_active && profile.availability === 'available').length
  const linkedCount = profiles.filter((profile) => profile.member_linked).length
  const orgById = useMemo(() => new Map(orgUnits.map((unit) => [unit.id, unit])), [orgUnits])

  async function toggleActive(profile: VolunteerDirectoryRow) {
    if (!access.can_manage) return
    const nextState = !profile.is_active
    const reason = window.prompt(
      nextState ? 'Optional reactivation note:' : 'Reason for deactivating this volunteer:',
      '',
    )
    if (reason === null) return

    setSavingId(profile.id)
    setError('')
    const { error: updateError } = await supabase.rpc('set_volunteer_active', {
      p_volunteer_id: profile.id,
      p_is_active: nextState,
      p_reason: reason.trim() || null,
    })
    if (updateError) setError(updateError.message)
    else await loadWorkbench()
    setSavingId('')
  }

  if (loading) {
    return <WorkbenchFrame><div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200/70"><div className="flex items-center gap-3 text-sm font-bold text-slate-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading scoped volunteer registry…</div></div></WorkbenchFrame>
  }

  if (!access.can_view) {
    return (
      <WorkbenchFrame>
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-amber-700" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">Volunteer workbench access required</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">This workspace is limited to authorized operations leadership, coordinators, supervisors and auditors. Access scope is enforced in the database.</p>
          <Link to="/dashboard" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white no-underline">Back to dashboard</Link>
        </section>
      </WorkbenchFrame>
    )
  }

  return (
    <WorkbenchFrame>
      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-white to-emerald-700" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">Operations · Volunteer Registry</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">Coordinator Workbench</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">Only volunteers inside your authorized organization subtree are returned by RLS. Search by skills, duty preference, profession, language or location.</p>
            </div>
            <button type="button" onClick={() => void loadWorkbench()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/15"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<Users className="h-5 w-5" />} label="Visible volunteers" value={String(profiles.length)} />
          <Metric icon={<BadgeCheck className="h-5 w-5" />} label="Active" value={String(activeCount)} />
          <Metric icon={<UserRoundCheck className="h-5 w-5" />} label="Available now" value={String(availableCount)} />
          <Metric icon={<ShieldCheck className="h-5 w-5" />} label="Membership linked" value={String(linkedCount)} />
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="flex items-center gap-2 text-slate-950"><Filter className="h-5 w-5 text-emerald-700" /><h2 className="text-lg font-black">Search & filters</h2></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-10`} placeholder="Name, mobile, skill, duty, profession, language or location" /></label>
            <select value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)} className={inputClass}><option value="all">All availability</option><option value="available">Available</option><option value="limited">Limited</option><option value="unavailable">Unavailable</option></select>
            <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)} className={inputClass}><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="all">All states</option></select>
          </div>
          <p className="mt-3 text-xs font-bold text-slate-400">Showing {filteredProfiles.length} of {profiles.length} records available to your scope.</p>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {filteredProfiles.length === 0 ? (
            <div className="xl:col-span-2 rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70"><Sparkles className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-900">No volunteers match these filters.</p></div>
          ) : filteredProfiles.map((profile) => {
            const org = orgById.get(profile.org_unit_id)
            const capabilities = capabilityLabels(profile)
            return (
              <article key={profile.id} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-black text-slate-950">{profile.full_name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${profile.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{profile.is_active ? 'Active' : 'Inactive'}</span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">{profile.availability}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{profile.mobile}{profile.profession ? ` · ${profile.profession}` : ''}</p>
                  </div>
                  {access.can_manage ? <button type="button" disabled={savingId === profile.id} onClick={() => void toggleActive(profile)} className={`rounded-xl px-3 py-2 text-xs font-black disabled:opacity-50 ${profile.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>{savingId === profile.id ? 'Saving…' : profile.is_active ? 'Deactivate' : 'Reactivate'}</button> : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase text-slate-500">Read only</span>}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Detail icon={<MapPin className="h-4 w-4" />} label="Location" value={geographyPath(geographies, profile.geography_id) || org?.name || '—'} />
                  <Detail icon={<Activity className="h-4 w-4" />} label="Preferred duties" value={profile.preferred_duties.join(', ') || 'Not specified'} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.skills.slice(0, 8).map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{skill}</span>)}
                  {capabilities.slice(0, 6).map((capability) => <span key={capability} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{capability}</span>)}
                </div>

                {profile.availability_notes ? <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">Availability: {profile.availability_notes}</p> : null}
              </article>
            )
          })}
        </section>
      </div>
    </WorkbenchFrame>
  )
}

function WorkbenchFrame({ children }: { children: React.ReactNode }) {
  return <main className="px-4 py-8 md:py-10"><div className="page-wrap">{children}</div></main>
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><div className="text-emerald-700">{icon}</div><p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">{icon}{label}</p><p className="mt-1 text-xs font-bold leading-5 text-slate-700">{value}</p></div>
}
