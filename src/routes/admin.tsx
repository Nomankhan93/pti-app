import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Download, IdCard, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AdminShell } from '../components/admin/AdminShell'
import { useI18n } from '../lib/i18n'
import { csvCell, maskCnic, maskMobile } from '../lib/shared/formatters'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type Member = {
  id: string
  full_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  photo_url: string
  is_active: boolean
  member_no: string | null
  issued_at: string
  created_at: string
}

type ActiveFilter = 'all' | 'active' | 'inactive'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function AdminPage() {
  const navigate = useNavigate()
  const { t, direction, language } = useI18n()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isChildAdminPage = pathname !== '/admin'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, cards: 0 })
  const [totalCount, setTotalCount] = useState(0)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [showSensitive, setShowSensitive] = useState(false)
  const [error, setError] = useState('')

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const currentEnd = Math.min(page * pageSize, totalCount)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search.trim())
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (!isChildAdminPage) void loadAdmin()
  }, [activeFilter, debouncedSearch, isChildAdminPage, page, pageSize])

  if (isChildAdminPage) return <Outlet />

  async function requireAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return false
    }

    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) throw roleError
    if (!role) {
      navigate({ to: '/dashboard' })
      return false
    }

    return true
  }

  function applyFilters(query: any) {
    if (activeFilter === 'active') query = query.eq('is_active', true)
    if (activeFilter === 'inactive') query = query.eq('is_active', false)

    const safeSearch = debouncedSearch.replace(/[,%()]/g, ' ').trim()
    if (safeSearch) {
      const pattern = `*${safeSearch}*`
      query = query.or([
        `full_name.ilike.${pattern}`,
        `cnic.ilike.${pattern}`,
        `mobile.ilike.${pattern}`,
        `district.ilike.${pattern}`,
        `taluka.ilike.${pattern}`,
        `designation.ilike.${pattern}`,
        `member_no.ilike.${pattern}`,
      ].join(','))
    }

    return query
  }

  async function loadAdmin() {
    setLoading((previous) => members.length === 0 || previous)
    setRefreshing(members.length > 0)
    setError('')

    try {
      if (!(await requireAdmin())) return

      const start = (page - 1) * pageSize
      const end = start + pageSize - 1
      let query: any = supabase
        .from('members')
        .select('id, full_name, cnic, mobile, district, taluka, designation, designation_level, designation_area, photo_url, is_active, member_no, issued_at, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      query = applyFilters(query)
      const { data, error: memberError, count } = await query
      if (memberError) throw memberError

      const rows = (data ?? []) as Member[]
      setMembers(rows)
      setTotalCount(count ?? 0)

      const [total, active, inactive, cards] = await Promise.all([
        countMembers(),
        countMembers(true),
        countMembers(false),
        countCards(),
      ])
      setStats({ total, active, inactive, cards })

      const signedMap: Record<string, string> = {}
      await Promise.all(rows.map(async (member) => {
        if (!member.photo_url) return
        const { data: signed } = await supabase.storage.from('member-photos').createSignedUrl(member.photo_url, 60 * 60)
        if (signed?.signedUrl) signedMap[member.id] = signed.signedUrl
      }))
      setPhotoUrls(signedMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load members.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function countMembers(active?: boolean) {
    let query = supabase.from('members').select('id', { count: 'exact', head: true })
    if (typeof active === 'boolean') query = query.eq('is_active', active)
    const { count, error } = await query
    if (error) throw error
    return count ?? 0
  }

  async function countCards() {
    const { count, error } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('member_no', 'is', null)
    if (error) throw error
    return count ?? 0
  }

  async function exportCsv() {
    setExporting(true)
    setError('')
    try {
      if (!(await requireAdmin())) return
      const { data, error: exportError } = await supabase
        .from('members')
        .select('member_no, full_name, cnic, mobile, district, taluka, designation, designation_level, designation_area, is_active, issued_at, created_at')
        .order('created_at', { ascending: false })
      if (exportError) throw exportError

      const rows = data ?? []
      const header = ['Member No', 'Full Name', 'CNIC', 'Mobile', 'District', 'Taluka', 'Designation', 'Level', 'Area', 'Active', 'Issued At', 'Created At']
      const lines = [header.map(csvCell).join(',')]
      for (const row of rows) {
        lines.push([
          row.member_no,
          row.full_name,
          row.cnic,
          row.mobile,
          row.district,
          row.taluka,
          row.designation,
          row.designation_level,
          row.designation_area,
          row.is_active ? 'Yes' : 'No',
          row.issued_at,
          row.created_at,
        ].map(csvCell).join(','))
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `pti-members-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export members.')
    } finally {
      setExporting(false)
    }
  }

  const statsCards = useMemo(() => [
    { label: 'Total Members', value: stats.total, icon: Users },
    { label: 'Active Members', value: stats.active, icon: ShieldCheck },
    { label: 'Inactive Members', value: stats.inactive, icon: Users },
    { label: 'Issued Cards', value: stats.cards, icon: IdCard },
  ], [stats])

  return (
    <AdminShell title={t('admin.title')} subtitle="Manage self-issued PTI memberships, profile data, designations and activation.">
      <div className="space-y-6" dir={direction}>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statsCards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
                <Icon className="h-5 w-5 text-emerald-700" />
              </div>
              <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <label>
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Search</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, CNIC, mobile, member no..." className="input pl-10" />
                </div>
              </label>
              <label>
                <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Membership</span>
                <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value as ActiveFilter); setPage(1) }} className="input">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadAdmin()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button type="button" onClick={() => void exportCsv()} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                <Download className="h-4 w-4" /> {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}

        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70">
          {loading ? (
            <div className="p-8 text-sm font-bold text-slate-600">{t('admin.loading')}</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-slate-600">No members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Member</th>
                    <th className="px-5 py-4">Member No</th>
                    <th className="px-5 py-4">District / Taluka</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Designation</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Issued</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {photoUrls[member.id] ? <img src={photoUrls[member.id]} alt="" className="h-11 w-11 rounded-xl object-cover object-top ring-1 ring-slate-200" /> : <div className="h-11 w-11 rounded-xl bg-slate-100" />}
                          <div><p className="font-black text-slate-950">{member.full_name}</p><p className="text-xs font-semibold text-slate-500">{showSensitive ? member.cnic : maskCnic(member.cnic)}</p></div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-black text-slate-800">{member.member_no}</td>
                      <td className="px-5 py-4"><p className="font-bold text-slate-800">{member.district}</p><p className="text-xs text-slate-500">{member.taluka || '—'}</p></td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{showSensitive ? member.mobile : maskMobile(member.mobile)}</td>
                      <td className="px-5 py-4"><p className="font-bold text-slate-800">{member.designation || '—'}</p><p className="text-xs text-slate-500">{member.designation_level || ''}</p></td>
                      <td className="px-5 py-4"><StatusBadge active={member.is_active} /></td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600">{formatDate(member.issued_at, language)}</td>
                      <td className="px-5 py-4"><Link to="/admin/members/$id" params={{ id: member.id }} className="font-black text-emerald-800 no-underline hover:underline">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span>{currentStart}-{currentEnd} of {totalCount}</span>
              <button type="button" onClick={() => setShowSensitive((value) => !value)} className="font-black text-emerald-800">{showSensitive ? 'Hide sensitive' : 'Show sensitive'}</button>
            </div>
            <div className="flex items-center gap-2">
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold">
                {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} / page</option>)}
              </select>
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black disabled:opacity-40">Previous</button>
              <span className="text-xs font-bold text-slate-500">{page}/{totalPages}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-black disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{active ? 'Active' : 'Inactive'}</span>
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const locale = language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-PK'
  return date.toLocaleDateString(locale)
}
