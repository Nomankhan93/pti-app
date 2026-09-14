import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  BadgeCheck,
  CalendarDays,
  Copy,
  Eye,
  EyeOff,
  IdCard,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type Member = {
  id: string
  user_id: string
  member_no: string | null
  public_verify_token: string
  full_name: string
  father_name: string
  cnic: string
  mobile: string
  district: string
  taluka: string | null
  address: string | null
  date_of_birth: string | null
  gender: string | null
  education: string | null
  blood_group: string | null
  profession: string | null
  designation: string | null
  designation_level: string | null
  designation_area: string | null
  caste_branch: string | null
  emergency_contact_name: string | null
  emergency_contact_relation: string | null
  emergency_contact_mobile: string | null
  declaration_accepted: boolean
  photo_url: string | null
  issued_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

function DashboardPage() {
  const navigate = useNavigate()
  const { t, direction, language } = useI18n()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showSensitive, setShowSensitive] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void loadDashboard()
  }, [])

  const verifyUrl = useMemo(() => {
    if (!member?.public_verify_token || typeof window === 'undefined') return ''
    return `${window.location.origin}/verify/${encodeURIComponent(member.public_verify_token)}`
  }, [member?.public_verify_token])

  async function loadDashboard() {
    setLoading((previous) => previous && !member)
    setRefreshing(Boolean(member))
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      navigate({ to: '/login' })
      return
    }

    const { data, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      setRefreshing(false)
      return
    }

    const nextMember = data as Member | null
    setMember(nextMember)

    if (nextMember?.photo_url) {
      const { data: signed } = await supabase.storage
        .from('member-photos')
        .createSignedUrl(nextMember.photo_url, 60 * 60)

      setPhotoSignedUrl(signed?.signedUrl ?? null)
    } else {
      setPhotoSignedUrl(null)
    }

    setLoading(false)
    setRefreshing(false)
  }

  async function copyVerifyLink() {
    if (!verifyUrl) return

    try {
      await navigator.clipboard.writeText(verifyUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError(t('dashboard.copyFailed'))
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-10" dir={direction}>
        <div className="page-wrap rounded-[2rem] border border-white/70 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t('dashboard.loading')}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 py-8 md:py-10" dir={direction}>
      <div className="page-wrap space-y-6">
        <header className="relative isolate overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:p-8">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-white to-emerald-700" />
          <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
                {t('brand.name')}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
                {member ? `Welcome, ${member.full_name}` : t('dashboard.title')}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70 md:text-base">
                {member
                  ? membershipMessage(member.is_active, language)
                  : t('dashboard.description')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('dashboard.refresh')}
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {error}
          </div>
        ) : null}

        {!member ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <UserRound className="mx-auto h-12 w-12 text-emerald-700" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              {t('dashboard.completeRegistrationTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">
              Registration is free. Your PTI member number and digital membership are issued automatically when you submit the form.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex rounded-xl bg-emerald-800 px-5 py-3 text-sm font-black text-white no-underline hover:bg-emerald-900"
              >
                {t('dashboard.fillMembershipForm')}
              </Link>
              <Link
                to="/volunteer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 no-underline hover:bg-emerald-100"
              >
                <HeartHandshake className="h-4 w-4" />
                Register as Volunteer
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                {photoSignedUrl ? (
                  <img
                    src={photoSignedUrl}
                    alt={member.full_name}
                    className="aspect-square w-full rounded-[1.5rem] object-cover object-top ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-[1.5rem] bg-slate-100 text-slate-400">
                    <UserRound className="h-16 w-16" />
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${member.is_active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
                    <BadgeCheck className="h-4 w-4" />
                    {member.is_active ? activeLabel(language) : inactiveLabel(language)}
                  </span>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">PTI Membership</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">{member.full_name}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{member.member_no ?? t('common.na')}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSensitive((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showSensitive ? t('dashboard.hideSensitive') : t('dashboard.showSensitive')}
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Info label={t('dashboard.memberNo')} value={member.member_no} icon={<IdCard className="h-4 w-4" />} />
                  <Info label={issueDateLabel(language)} value={formatDate(member.issued_at, language)} icon={<CalendarDays className="h-4 w-4" />} />
                  <Info label={t('dashboard.district')} value={member.district} />
                  <Info label={t('dashboard.taluka')} value={member.taluka} />
                  <Info label={t('dashboard.designation')} value={member.designation} />
                  <Info label={t('dashboard.designationLevel')} value={member.designation_level} />
                  <Info label={t('dashboard.designationArea')} value={member.designation_area} />
                  <Info label={t('dashboard.mobile')} value={showSensitive ? member.mobile : maskMobile(member.mobile)} />
                  <Info label={t('dashboard.cnic')} value={showSensitive ? member.cnic : maskCnic(member.cnic)} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/register"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 no-underline hover:bg-slate-50"
                  >
                    {t('dashboard.editApplication')}
                  </Link>

                  {member.is_active && member.member_no ? (
                    <Link
                      to="/card"
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-black text-white no-underline hover:bg-emerald-900"
                    >
                      <IdCard className="h-4 w-4" />
                      {t('nav.digitalCard')}
                    </Link>
                  ) : null}

                  {member.is_active && member.member_no ? (
                    <Link
                      to="/verify/$memberNo"
                      params={{ memberNo: member.public_verify_token }}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 no-underline hover:bg-emerald-100"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {t('common.openVerificationPage')}
                    </Link>
                  ) : null}

                  {member.is_active && verifyUrl ? (
                    <button
                      type="button"
                      onClick={() => void copyVerifyLink()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? t('common.copied') : t('common.copyVerificationLink')}
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Volunteer Registry</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Contribute your skills to PTI operations</h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">Register availability, skills and preferred duties. Volunteer registration is separate from membership and becomes active without an approval queue.</p>
                </div>
                <Link to="/volunteer" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-black text-white no-underline hover:bg-emerald-900">
                  <HeartHandshake className="h-4 w-4" /> Open Volunteer Profile
                </Link>
              </div>
            </section>

            {!member.is_active ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900">
                This membership is currently inactive. Digital card and public verification remain unavailable until an administrator reactivates it.
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

function Info({ label, value, icon }: { label: string; value: string | null | undefined; icon?: ReactNode }) {
  const { t } = useI18n()

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value || t('common.notProvided')}</p>
    </div>
  )
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const locale = language === 'ur' ? 'ur-PK' : 'en-PK'
  return date.toLocaleDateString(locale)
}

function maskCnic(value: string) {
  if (value.length < 5) return '•••••••••••••'
  return `${value.slice(0, 5)}-•••••••-•`
}

function maskMobile(value: string) {
  if (value.length < 4) return '•••••••••••'
  return `${value.slice(0, 4)}••••${value.slice(-3)}`
}

function activeLabel(language: string) {
  if (language === 'ur') return 'ممبرشپ فعال'
  return 'Membership Active'
}

function inactiveLabel(language: string) {
  if (language === 'ur') return 'ممبرشپ غیر فعال'
  return 'Membership Inactive'
}

function issueDateLabel(language: string) {
  if (language === 'ur') return 'اجراء کی تاریخ'
  return 'Issue Date'
}

function membershipMessage(isActive: boolean, language: string) {
  if (language === 'ur') {
    return isActive
      ? 'آپ کی PTI ممبرشپ رجسٹریشن کے ساتھ خودکار طور پر جاری اور فعال ہو گئی ہے۔'
      : 'آپ کی PTI ممبرشپ فی الحال غیر فعال ہے۔'
  }
  return isActive
    ? 'Your PTI membership was issued automatically at registration. No payment or admin approval is required.'
    : 'Your PTI membership is currently inactive.'
}
