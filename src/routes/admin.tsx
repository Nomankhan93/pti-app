import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BadgeCheck, Download, IdCard, ListChecks, RefreshCw, Search, ShieldCheck, Users, XCircle } from 'lucide-react'
import { AdminShell } from '../components/admin/AdminShell'
import { useI18n, type TranslationKey } from '../lib/i18n'
import {
  csvCell,
  maskCnic,
  maskMobile,
} from '../lib/shared/formatters'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

type MemberStatus = 'pending' | 'approved' | 'rejected'

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
  status: MemberStatus
  member_no: string | null
  created_at: string
}

type ExportMember = Member & {
  father_name: string
  approved_at: string | null
}

type AdminStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  cards: number
}

const statusLabelKeys: Record<MemberStatus, TranslationKey> = {
  pending: 'common.status.pending',
  approved: 'common.status.approved',
  rejected: 'common.status.rejected',
}

const sindhDistricts = [
  'Badin',
  'Dadu',
  'Ghotki',
  'Hyderabad',
  'Jacobabad',
  'Jamshoro',
  'Karachi Central',
  'Karachi East',
  'Karachi South',
  'Karachi West',
  'Kashmore',
  'Keamari',
  'Khairpur',
  'Korangi',
  'Larkana',
  'Malir',
  'Matiari',
  'Mirpur Khas',
  'Naushahro Firoze',
  'Qambar Shahdadkot',
  'Sanghar',
  'Shaheed Benazirabad',
  'Shikarpur',
  'Sujawal',
  'Sukkur',
  'Tando Allahyar',
  'Tando Muhammad Khan',
  'Tharparkar',
  'Thatta',
  'Umerkot',
]

const talukasByDistrict: Record<string, string[]> = {
  Badin: ['Badin', 'Matli', 'Shaheed Fazil Rahu (Golarchi)', 'Talhar', 'Tando Bago'],
  Dadu: ['Dadu', 'Johi', 'Khairpur Nathan Shah', 'Mehar'],
  Ghotki: ['Daharki', 'Ghotki', 'Khangarh', 'Mirpur Mathelo', 'Ubauro'],
  Hyderabad: ['Hyderabad City', 'Hyderabad Rural', 'Latifabad', 'Qasimabad'],
  Jacobabad: ['Garhi Khairo', 'Jacobabad', 'Thul'],
  Jamshoro: ['Kotri', 'Manjhand', 'Sehwan Sharif', 'Thano Bula Khan'],
  'Karachi Central': ['Gulberg', 'Liaquatabad', 'Nazimabad', 'New Karachi', 'North Nazimabad'],
  'Karachi East': ['Ferozabad', 'Gulshan-e-Iqbal', 'Gulzar-e-Hijri', 'Jamshed Quarters'],
  'Karachi South': ['Aram Bagh', 'Civil Line', 'Garden', 'Lyari', 'Saddar'],
  'Karachi West': ['Mango Pir', 'Mominabad', 'Orangi'],
  Kashmore: ['Kandhkot', 'Kashmore', 'Tangwani'],
  Keamari: ['Baldia', 'Harbour', 'Mauripur', 'SITE'],
  Khairpur: ['Faiz Ganj', 'Gambat', 'Khairpur', 'Kingri', 'Kot Diji', 'Mirwah', 'Nara', 'Sobho Dero'],
  Korangi: ['Korangi', 'Landhi', 'Model Colony', 'Shah Faisal'],
  Larkana: ['Bakrani', 'Dokri', 'Larkana', 'Ratodero'],
  Malir: ['Airport', 'Bin Qasim', 'Gadap', 'Ibrahim Hyderi', 'Murad Memon', 'Shah Murad'],
  Matiari: ['Hala', 'Matiari', 'Saeedabad'],
  'Mirpur Khas': ['Digri', 'Hussain Bux Mari', 'Jhuddo', 'Kot Ghulam Muhammad', 'Mirpur Khas', 'Shujabad', 'Sindhri'],
  'Naushahro Firoze': ['Bhiria', 'Kandiaro', 'Mehrabpur', 'Moro', 'Naushahro Firoze'],
  'Qambar Shahdadkot': ['Mirokhan', 'Nasirabad', 'Qambar', 'Qubo Saeed Khan', 'Shahdadkot', 'Sijawal Junejo', 'Warah'],
  Sanghar: ['Jam Nawaz Ali', 'Khipro', 'Sanghar', 'Shahdadpur', 'Sinjhoro', 'Tando Adam'],
  'Shaheed Benazirabad': ['Daur', 'Nawabshah', 'Qazi Ahmed', 'Sakrand'],
  Shikarpur: ['Garhi Yasin', 'Khanpur', 'Lakhi Ghulam Shah', 'Shikarpur'],
  Sujawal: ['Jati', 'Kharo Chan', 'Mirpur Bathoro', 'Shah Bunder', 'Sujawal'],
  Sukkur: ['New Sukkur', 'Pano Aqil', 'Rohri', 'Salehpat', 'Sukkur'],
  'Tando Allahyar': ['Chamber', 'Jhando Mari', 'Tando Allahyar'],
  'Tando Muhammad Khan': ['Bulri Shah Karim', 'Tando Ghulam Hyder', 'Tando Muhammad Khan'],
  Tharparkar: ['Chachro', 'Dahli', 'Diplo', 'Islamkot', 'Kaloi', 'Mithi', 'Nagarparkar'],
  Thatta: ['Ghorabari', 'Keti Bunder', 'Mirpur Sakro', 'Thatta'],
  Umerkot: ['Kunri', 'Pithoro', 'Samaro', 'Umerkot'],
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function AdminPage() {
  const navigate = useNavigate()
  const { t, direction, language } = useI18n()

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const isMemberDetailPage = pathname.startsWith('/admin/members/')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [stats, setStats] = useState<AdminStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cards: 0,
  })
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [talukaFilter, setTalukaFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [showSensitive, setShowSensitive] = useState(false)
  const [error, setError] = useState('')

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const currentEnd = Math.min(page * pageSize, totalCount)
  const talukaOptions = useMemo(
    () => (districtFilter !== 'all' ? talukasByDistrict[districtFilter] ?? [] : []),
    [districtFilter],
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1)
      setDebouncedSearch(search.trim())
    }, 350)

    return () => window.clearTimeout(timeout)
  }, [search])

  useEffect(() => {
    if (!isMemberDetailPage) {
      void loadAdmin()
    }
  }, [
    debouncedSearch,
    districtFilter,
    fromDate,
    isMemberDetailPage,
    page,
    pageSize,
    statusFilter,
    talukaFilter,
    toDate,
  ])

  if (isMemberDetailPage) {
    return <Outlet />
  }

  async function loadAdmin() {
    setLoading((previous) => members.length === 0 || previous)
    setRefreshing(members.length > 0)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      setError(roleError.message)
      setLoading(false)
      setRefreshing(false)
      return
    }

    if (!role) {
      navigate({ to: '/dashboard' })
      return
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    let query: any = supabase
      .from('members')
      .select(
        'id, full_name, cnic, mobile, district, taluka, designation, designation_level, designation_area, photo_url, status, member_no, created_at',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(start, end)

    query = applyMemberFilters(query, { includeStatus: true })

    const { data, error, count } = await query

    if (error) {
      setError(error.message)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const rows = (data ?? []) as Member[]
    setMembers(rows)
    setTotalCount(count ?? 0)

    const [total, pending, approved, rejected, cards] = await Promise.all([
      countMembers(),
      countMembers('pending'),
      countMembers('approved'),
      countMembers('rejected'),
      countIssuedCards(),
    ])

    setStats({ total, pending, approved, rejected, cards })

    const signedMap: Record<string, string> = {}

    await Promise.all(
      rows.map(async (member) => {
        if (!member.photo_url) return

        const { data: signed } = await supabase.storage
          .from('member-photos')
          .createSignedUrl(member.photo_url, 60 * 60)

        if (signed?.signedUrl) {
          signedMap[member.id] = signed.signedUrl
        }
      }),
    )

    setPhotoUrls(signedMap)
    setLoading(false)
    setRefreshing(false)
  }

  function applyMemberFilters(
    query: any,
    options: { includeStatus: boolean; forceStatus?: MemberStatus } = {
      includeStatus: true,
    },
  ) {
    const statusToApply = options.forceStatus ?? statusFilter

    if (options.includeStatus && statusToApply !== 'all') {
      query = query.eq('status', statusToApply)
    }

    if (districtFilter !== 'all') {
      query = query.eq('district', districtFilter)
    }

    if (talukaFilter !== 'all') {
      query = query.eq('taluka', talukaFilter)
    }

    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00.000Z`)
    }

    if (toDate) {
      query = query.lt('created_at', getNextDateIso(toDate))
    }

    const safeSearch = sanitizeSearchTerm(debouncedSearch)

    if (safeSearch) {
      const pattern = `*${safeSearch}*`
      query = query.or(
        [
          `full_name.ilike.${pattern}`,
          `cnic.ilike.${pattern}`,
          `mobile.ilike.${pattern}`,
          `district.ilike.${pattern}`,
          `taluka.ilike.${pattern}`,
          `designation.ilike.${pattern}`,
          `designation_level.ilike.${pattern}`,
          `designation_area.ilike.${pattern}`,
          `member_no.ilike.${pattern}`,
        ].join(','),
      )
    }

    return query
  }

  async function countMembers(forceStatus?: MemberStatus) {
    let query: any = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })

    query = applyMemberFilters(query, {
      includeStatus: Boolean(forceStatus),
      forceStatus,
    })

    const { count } = await query
    return count ?? 0
  }

  async function countIssuedCards() {
    let query: any = supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .not('member_no', 'is', null)

    if (districtFilter !== 'all') {
      query = query.eq('district', districtFilter)
    }

    if (talukaFilter !== 'all') {
      query = query.eq('taluka', talukaFilter)
    }

    if (fromDate) {
      query = query.gte('created_at', `${fromDate}T00:00:00.000Z`)
    }

    if (toDate) {
      query = query.lt('created_at', getNextDateIso(toDate))
    }

    const safeSearch = sanitizeSearchTerm(debouncedSearch)

    if (safeSearch) {
      const pattern = `*${safeSearch}*`
      query = query.or(
        [
          `full_name.ilike.${pattern}`,
          `cnic.ilike.${pattern}`,
          `mobile.ilike.${pattern}`,
          `district.ilike.${pattern}`,
          `taluka.ilike.${pattern}`,
          `designation.ilike.${pattern}`,
          `designation_level.ilike.${pattern}`,
          `designation_area.ilike.${pattern}`,
          `member_no.ilike.${pattern}`,
        ].join(','),
      )
    }

    const { count } = await query
    return count ?? 0
  }

  function resetFilters() {
    setStatusFilter('all')
    setDistrictFilter('all')
    setTalukaFilter('all')
    setFromDate('')
    setToDate('')
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  async function handleExportCsv() {
    setExporting(true)
    setError('')

    try {
      let query: any = supabase
        .from('members')
        .select(
          'id, full_name, father_name, cnic, mobile, district, taluka, designation, designation_level, designation_area, photo_url, status, member_no, created_at, approved_at',
        )
        .order('created_at', { ascending: false })
        .limit(5000)

      query = applyMemberFilters(query, { includeStatus: true })

      const { data, error } = await query

      if (error) throw new Error(error.message)

      const rows = (data ?? []) as ExportMember[]
      const csv = buildMembersCsv(rows, showSensitive, language)
      const filename = `bbjf-members-${new Date().toISOString().slice(0, 10)}.csv`
      downloadTextFile(csv, filename, 'text/csv;charset=utf-8')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <AdminShell title={t('admin.title')} subtitle={t('admin.description')}>
        <div className="rounded-2xl bg-white p-6 shadow-sm" dir={direction}>
          {t('admin.loading')}
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell title={t('admin.title')} subtitle={t('admin.description')}>
      <div className="space-y-6" dir={direction}>
        <header className="relative isolate overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] md:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-white to-emerald-700" />
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-red-500/15 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
                BBJF Membership Console
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                {t('admin.title')}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70 md:text-base">
                Review applications, verify Rs. 500 membership receipts, approve members, reject incomplete forms and manage QR-enabled digital cards. Donation and program modules are not included in this BBJF portal.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadAdmin()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              <button
                type="button"
                onClick={() => void handleExportCsv()}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Total Applications"
            value={stats.total}
            tone="slate"
            icon={<Users className="h-5 w-5" />}
            active={statusFilter === 'all'}
            onClick={() => {
              setStatusFilter('all')
              setPage(1)
            }}
          />
          <StatCard
            label={t('common.status.pending')}
            value={stats.pending}
            tone="amber"
            icon={<ListChecks className="h-5 w-5" />}
            active={statusFilter === 'pending'}
            onClick={() => {
              setStatusFilter('pending')
              setPage(1)
            }}
          />
          <StatCard
            label={t('common.status.approved')}
            value={stats.approved}
            tone="emerald"
            icon={<BadgeCheck className="h-5 w-5" />}
            active={statusFilter === 'approved'}
            onClick={() => {
              setStatusFilter('approved')
              setPage(1)
            }}
          />
          <StatCard
            label={t('common.status.rejected')}
            value={stats.rejected}
            tone="red"
            icon={<XCircle className="h-5 w-5" />}
            active={statusFilter === 'rejected'}
            onClick={() => {
              setStatusFilter('rejected')
              setPage(1)
            }}
          />
          <StatCard
            label="Cards Issued"
            value={stats.cards}
            tone="gold"
            icon={<IdCard className="h-5 w-5" />}
            active={false}
            onClick={() => {
              setStatusFilter('approved')
              setPage(1)
            }}
          />
        </section>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Membership management
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                Member Applications
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Showing {currentStart}-{currentEnd} of {totalCount} records.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-10"
                placeholder={t('admin.searchPlaceholder')}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | MemberStatus)
                setPage(1)
              }}
              className="input"
            >
              <option value="all">{t('admin.allStatuses')}</option>
              <option value="pending">{t('common.status.pending')}</option>
              <option value="approved">{t('common.status.approved')}</option>
              <option value="rejected">{t('common.status.rejected')}</option>
            </select>

            <select
              value={districtFilter}
              onChange={(event) => {
                setDistrictFilter(event.target.value)
                setTalukaFilter('all')
                setPage(1)
              }}
              className="input"
            >
              <option value="all">All districts</option>
              {sindhDistricts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            <select
              value={talukaFilter}
              onChange={(event) => {
                setTalukaFilter(event.target.value)
                setPage(1)
              }}
              className="input"
              disabled={districtFilter === 'all'}
            >
              <option value="all">All talukas</option>
              {talukaOptions.map((taluka) => (
                <option key={taluka} value={taluka}>
                  {taluka}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value)
                setPage(1)
              }}
              className="input"
              aria-label="Submitted from date"
            />

            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value)
                setPage(1)
              }}
              className="input"
              aria-label="Submitted to date"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>
                Showing {currentStart}-{currentEnd} of {totalCount}
              </span>

              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showSensitive}
                  onChange={(event) => setShowSensitive(event.target.checked)}
                />
                <span>Show CNIC/mobile</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reset filters
              </button>

              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(1)
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3">{t('admin.table.photo')}</th>
                  <th className="py-3">{t('admin.table.name')}</th>
                  <th className="py-3">{t('admin.table.designation')}</th>
                  <th className="py-3">{t('admin.table.cnic')}</th>
                  <th className="py-3">{t('admin.table.contact')}</th>
                  <th className="py-3">{t('admin.table.area')}</th>
                  <th className="py-3">{t('admin.table.status')}</th>
                  <th className="py-3">{t('admin.table.memberNo')}</th>
                  <th className="py-3">{t('admin.table.submitted')}</th>
                  <th className="py-3">{t('admin.table.action')}</th>
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="py-3">
                      {photoUrls[member.id] ? (
                        <img
                          src={photoUrls[member.id]}
                          alt={member.full_name}
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-slate-100" />
                      )}
                    </td>

                    <td className="py-3 font-medium text-slate-900">
                      <p>{member.full_name}</p>
                      <p className="text-xs font-normal text-slate-500">
                        {member.id.slice(0, 8)}
                      </p>
                    </td>

                    <td className="py-3 text-slate-700">
                      <p>{member.designation || t('common.notProvided')}</p>
                      <p className="text-xs text-slate-500">
                        {[member.designation_level, member.designation_area]
                          .filter(Boolean)
                          .join(' · ') || t('common.notProvided')}
                      </p>
                    </td>

                    <td className="py-3 text-slate-700">
                      {showSensitive ? member.cnic : maskCnic(member.cnic)}
                    </td>

                    <td className="py-3 text-slate-700">
                      {showSensitive ? member.mobile : maskMobile(member.mobile)}
                    </td>

                    <td className="py-3 text-slate-700">
                      <p>{member.district}</p>
                      <p className="text-xs text-slate-500">
                        {member.taluka || t('admin.talukaNotProvided')}
                      </p>
                    </td>

                    <td className="py-3">
                      <StatusBadge status={member.status} />
                    </td>

                    <td className="py-3 text-slate-700">
                      {member.member_no ?? '—'}
                    </td>

                    <td className="py-3 text-slate-700">
                      {formatDate(member.created_at, language)}
                    </td>

                    <td className="py-3">
                      <Link
                        to="/admin/members/$id"
                        params={{ id: member.id }}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white no-underline hover:bg-slate-800"
                      >
                        {t('admin.view')}
                      </Link>
                    </td>
                  </tr>
                ))}

                {members.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      {t('admin.noMembersFound')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                First
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Last
              </button>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

function StatCard({
  label,
  value,
  tone,
  icon,
  active,
  onClick,
}: {
  label: string
  value: number
  tone: 'slate' | 'amber' | 'emerald' | 'red' | 'gold'
  icon: ReactNode
  active: boolean
  onClick: () => void
}) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    gold: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.5rem] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? 'border-slate-950 bg-slate-950 text-white'
          : 'border-white/70 bg-white/90 text-slate-950'
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
          active ? 'bg-white/10 text-white ring-white/15' : toneClass
        }`}
      >
        {icon}
      </span>
      <span className={`mt-4 block text-xs font-black uppercase tracking-[0.16em] ${
        active ? 'text-white/60' : 'text-slate-400'
      }`}>
        {label}
      </span>
      <span className="mt-2 block text-3xl font-black">
        {value.toLocaleString('en-PK')}
      </span>
      <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
        active ? 'bg-white/10 text-white ring-white/15' : toneClass
      }`}>
        Live count
      </span>
    </button>
  )
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const { t } = useI18n()
  const styles = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-700 ring-red-200',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles[status]}`}
    >
      {t(statusLabelKeys[status])}
    </span>
  )
}

function buildMembersCsv(rows: ExportMember[], showSensitive: boolean, language: string) {
  const header = [
    'Member No',
    'Full Name',
    'Father Name',
    'CNIC',
    'Mobile',
    'District',
    'Taluka',
    'Designation',
    'Designation Level',
    'Designation Area',
    'Status',
    'Submitted At',
    'Approved At',
  ]

  const lines = rows.map((member) =>
    [
      member.member_no,
      member.full_name,
      member.father_name,
      showSensitive ? member.cnic : maskCnic(member.cnic),
      showSensitive ? member.mobile : maskMobile(member.mobile),
      member.district,
      member.taluka,
      member.designation,
      member.designation_level,
      member.designation_area,
      member.status,
      formatDate(member.created_at, language),
      formatDate(member.approved_at, language),
    ]
      .map(csvCell)
      .join(','),
  )

  return [header.map(csvCell).join(','), ...lines].join('\n')
}

function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function sanitizeSearchTerm(value: string) {
  return value.replace(/[*,()%]/g, '').trim().slice(0, 80)
}

function getNextDateIso(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString()
}

function getLocale(language: string) {
  return language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-PK'
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString(getLocale(language))
}
