import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  IdCard,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'
import {
  MEMBERSHIP_BASE_FEE,
  MEMBERSHIP_MANUAL_PAYMENT_DETAILS,
  MEMBERSHIP_PAYMENT_COMING_SOON_TEXT,
  MEMBERSHIP_PAYMENT_QR_IMAGE_PATH,
  type MembershipPayment,
  formatMembershipMoney,
  getMembershipPaymentDisplayStatus,
  getMembershipPaymentQrHelpText,
  getMembershipPaymentStatusClass,
  getMembershipPaymentStatusLabel,
} from '../lib/membership-fee'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type MemberStatus = 'pending' | 'approved' | 'rejected'

type Member = {
  id: string
  user_id: string
  member_no: string | null
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
  status: MemberStatus
  rejection_reason: string | null
  approved_at: string | null
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
  const [membershipPayment, setMembershipPayment] = useState<MembershipPayment | null>(null)
  const [error, setError] = useState('')
  const [showSensitive, setShowSensitive] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void loadDashboard()
  }, [])

  const verifyUrl = useMemo(() => {
    if (!member?.member_no || typeof window === 'undefined') return ''
    return `${window.location.origin}/verify/${encodeURIComponent(member.member_no)}`
  }, [member?.member_no])

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

    const { data, error: memberError } = await (supabase as any)
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
    setMembershipPayment(await loadMembershipPayment(nextMember?.id))

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
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/15 blur-3xl" />

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
                  ? 'Your membership profile, approval status and digital card actions are available here.'
                  : t('dashboard.description')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : t('dashboard.refresh')}
              </button>
              {member ? (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 no-underline transition hover:bg-slate-100"
                >
                  <ClipboardList className="h-4 w-4" />
                  {member.status === 'approved' ? 'View Form' : t('dashboard.editPendingForm')}
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {!member ? (
          <NoMemberState />
        ) : (
          <>
            <StatusHero
              member={member}
              language={language}
              verifyUrl={verifyUrl}
              copied={copied}
              onCopyVerifyLink={copyVerifyLink}
            />

            <section className="grid gap-4 md:grid-cols-5">
              <DashboardMetric
                icon={<ShieldCheck className="h-5 w-5" />}
                label={t('dashboard.currentStatus')}
                value={statusLabel(member.status, t)}
                tone={member.status}
              />
              <DashboardMetric
                icon={<IdCard className="h-5 w-5" />}
                label={t('dashboard.memberNo')}
                value={member.member_no ?? t('dashboard.notIssuedYet')}
                tone="neutral"
              />
              <DashboardMetric
                icon={<CalendarDays className="h-5 w-5" />}
                label={t('dashboard.submittedOn')}
                value={formatDate(member.created_at, language) ?? t('common.na')}
                tone="neutral"
              />
              <DashboardMetric
                icon={<BadgeCheck className="h-5 w-5" />}
                label={t('dashboard.approvedOn')}
                value={formatDate(member.approved_at, language) ?? t('common.na')}
                tone="approved"
              />
              <DashboardMetric
                icon={<CreditCard className="h-5 w-5" />}
                label={t('dashboard.feeStatus')}
                value={getMembershipPaymentStatusLabel(
                  getMembershipPaymentDisplayStatus(membershipPayment),
                )}
                tone="neutral"
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
              <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                      {t('dashboard.personalInfo')}
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      {t('dashboard.memberProfile')}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {t('dashboard.maskedDesc')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSensitive((value) => !value)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showSensitive ? t('dashboard.hideSensitive') : t('dashboard.showSensitive')}
                  </button>
                </div>

                <div className="mt-6 flex flex-col gap-6 md:flex-row">
                  <div className="shrink-0">
                    {photoSignedUrl ? (
                      <img
                        src={photoSignedUrl}
                        alt={member.full_name}
                        className="h-40 w-40 rounded-[1.6rem] border-4 border-white object-cover object-top shadow-lg ring-1 ring-slate-200"
                      />
                    ) : (
                      <div className="flex h-40 w-40 items-center justify-center rounded-[1.6rem] border border-slate-200 bg-slate-50 text-sm font-bold text-slate-500">
                        {t('dashboard.noPhoto')}
                      </div>
                    )}
                  </div>

                  <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoItem label={t('dashboard.fullName')} value={member.full_name} />
                    <InfoItem label={t('dashboard.fatherName')} value={member.father_name} />
                    <InfoItem label={t('dashboard.cnic')} value={showSensitive ? member.cnic : maskCnic(member.cnic)} />
                    <InfoItem label={t('dashboard.mobile')} value={showSensitive ? member.mobile : maskMobile(member.mobile)} />
                    <InfoItem label={t('dashboard.district')} value={member.district} />
                    <InfoItem label={t('dashboard.taluka')} value={member.taluka} />
                    <InfoItem label={t('dashboard.designation')} value={member.designation} />
                    <InfoItem label={t('dashboard.designationLevel')} value={member.designation_level} />
                    <InfoItem label={t('dashboard.designationArea')} value={member.designation_area} />
                    <InfoItem label={t('dashboard.profession')} value={member.profession} />
                    <InfoItem label={t('dashboard.education')} value={member.education} />
                    <InfoItem label={t('dashboard.bloodGroup')} value={member.blood_group} />
                    <InfoItem label={t('dashboard.dateOfBirth')} value={formatDate(member.date_of_birth, language)} />
                    <InfoItem label={t('dashboard.gender')} value={member.gender} />
                    <InfoItem label={t('dashboard.casteBranch')} value={member.caste_branch} />
                    <InfoItem
                      label={t('dashboard.declaration')}
                      value={member.declaration_accepted ? t('common.accepted') : t('common.notAccepted')}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)]">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <InfoItem label={t('dashboard.address')} value={member.address} />
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <InfoItem
                      label={t('dashboard.emergencyContact')}
                      value={
                        [
                          member.emergency_contact_name,
                          member.emergency_contact_relation,
                          member.emergency_contact_mobile
                            ? showSensitive
                              ? member.emergency_contact_mobile
                              : maskMobile(member.emergency_contact_mobile)
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || null
                      }
                    />
                  </div>
                </div>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                  <h2 className="text-lg font-black text-slate-950">
                    {t('dashboard.nextSteps')}
                  </h2>
                  <StatusTimeline status={member.status} />

                  <div className="mt-6 grid gap-3">
                    {member.status !== 'approved' ? (
                      <Link
                        to="/register"
                        className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-800 no-underline hover:bg-emerald-100"
                      >
                        {member.status === 'rejected'
                          ? t('dashboard.updateAndResubmit')
                          : t('dashboard.editPendingForm')}
                      </Link>
                    ) : null}

                    {member.status === 'approved' ? (
                      <>
                        <Link
                          to="/card"
                          className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white no-underline hover:bg-black"
                        >
                          {t('dashboard.viewDigitalCard')}
                        </Link>
                        <button
                          type="button"
                          onClick={copyVerifyLink}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                          <Copy className="h-4 w-4" />
                          {copied ? t('dashboard.linkCopied') : t('dashboard.copyVerifyLink')}
                        </button>
                      </>
                    ) : null}
                  </div>
                </section>

                <MembershipFeePanel payment={membershipPayment} />

                <section className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                  <h2 className="text-lg font-black text-slate-950">
                    {t('dashboard.currentStatus')}
                  </h2>
                  <div className="mt-4">
                    <StatusBadge status={member.status} />
                  </div>
                  <StatusNotice member={member} language={language} />
                </section>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  )
}


function MembershipFeePanel({ payment }: { payment: MembershipPayment | null }) {
  const { t } = useI18n()
  const status = getMembershipPaymentDisplayStatus(payment)

  return (
    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            {t('signup.fee.label')}
          </p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {formatMembershipMoney(payment?.total_amount ?? MEMBERSHIP_BASE_FEE)}
          </h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${getMembershipPaymentStatusClass(status)}`}
        >
          {getMembershipPaymentStatusLabel(status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <PaymentInfoBox
          label={t('dashboard.baseFee')}
          value={formatMembershipMoney(payment?.base_amount ?? MEMBERSHIP_BASE_FEE)}
        />
        <PaymentInfoBox
          label={t('dashboard.taxCharges')}
          value={payment ? formatMembershipMoney(payment.tax_amount) : t('dashboard.applicableAtPayment')}
        />
        <PaymentInfoBox
          label={t('dashboard.paymentAccount')}
          value={`${MEMBERSHIP_MANUAL_PAYMENT_DETAILS.bankName} · ${MEMBERSHIP_MANUAL_PAYMENT_DETAILS.accountNumber}`}
        />
        <PaymentInfoBox
          label={t('dashboard.receipt')}
          value={
            payment?.receipt_path
              ? payment.receipt_file_name || 'Uploaded for admin verification'
              : MEMBERSHIP_PAYMENT_COMING_SOON_TEXT
          }
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-white p-3 text-center shadow-sm">
        <img
          src={MEMBERSHIP_PAYMENT_QR_IMAGE_PATH}
          alt="Membership fee payment QR code"
          className="mx-auto w-full max-w-[180px] rounded-xl object-contain"
          loading="lazy"
        />
        <p className="mt-3 text-xs font-bold leading-5 text-slate-800">
          {getMembershipPaymentQrHelpText()}
        </p>
      </div>

      <p className="mt-4 text-xs font-bold leading-5 text-amber-800">
        {t('dashboard.receiptRequired')}
      </p>
    </section>
  )
}

function PaymentInfoBox({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-amber-100">
      <p className="text-[11px] font-black uppercase tracking-wide text-amber-700">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || '-'}
      </p>
    </div>
  )
}


function NoMemberState() {
  const { t } = useI18n()

  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <UserRound className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">
        {t('dashboard.completeRegistrationTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
        {t('dashboard.completeRegistrationDescription')}
      </p>
      <Link
        to="/register"
        className="mt-6 inline-flex rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white no-underline hover:bg-black"
      >
        {t('dashboard.fillMembershipForm')}
      </Link>
    </section>
  )
}

function StatusHero({
  member,
  language,
  verifyUrl,
  copied,
  onCopyVerifyLink,
}: {
  member: Member
  language: string
  verifyUrl: string
  copied: boolean
  onCopyVerifyLink: () => void
}) {
  const { t } = useI18n()
  const hero = getStatusHero(member.status)

  return (
    <section className={`rounded-[2rem] border p-5 shadow-sm md:p-6 ${hero.wrapper}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black ${hero.icon}`}>
            {hero.symbol}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={member.status} />
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                {member.member_no ?? t('dashboard.notIssuedYet')}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              {t(hero.titleKey)}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700">
              {t(hero.descriptionKey)}
            </p>
            <p className="mt-3 text-xs font-bold text-slate-500">
              {t('dashboard.submittedOn')}: {formatDate(member.created_at, language) ?? t('common.na')} · {t('dashboard.updated')}: {formatDate(member.updated_at, language) ?? t('common.na')}
            </p>
          </div>
        </div>

        {member.status === 'approved' && verifyUrl ? (
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200 lg:max-w-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {t('dashboard.publicVerification')}
            </p>
            <p className="break-all text-xs font-bold text-slate-700">
              {verifyUrl}
            </p>
            <button
              type="button"
              onClick={onCopyVerifyLink}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800"
            >
              {copied ? t('dashboard.linkCopied') : t('dashboard.copyVerifyLink')}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function DashboardMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  tone: MemberStatus | 'neutral'
}) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rejected: 'bg-red-50 text-red-700 ring-red-100',
    neutral: 'bg-slate-50 text-slate-700 ring-slate-100',
  }[tone]

  return (
    <article className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${styles}`}>
        {icon}
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-slate-950">
        {value}
      </p>
    </article>
  )
}

function StatusNotice({ member, language }: { member: Member; language: string }) {
  const { t } = useI18n()

  if (member.status === 'pending') {
    return (
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
        {t('dashboard.pendingNotice')}
      </p>
    )
  }

  if (member.status === 'approved') {
    return (
      <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
        <p className="font-black">{t('dashboard.verifiedMember')}</p>
        <p className="mt-1">
          {t('dashboard.approvedOn')}{' '}
          {member.approved_at ? formatDate(member.approved_at, language) : t('common.na')}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
      <p className="font-black">{t('dashboard.applicationRejected')}</p>
      <p className="mt-1">
        {member.rejection_reason || t('dashboard.noReasonProvided')}
      </p>
    </div>
  )
}

function StatusTimeline({ status }: { status: MemberStatus }) {
  const { t } = useI18n()
  const steps: Array<{ key: 'submitted' | 'review' | 'approved'; label: string; done: boolean; active: boolean }> = [
    {
      key: 'submitted',
      label: t('dashboard.timeline.submitted'),
      done: true,
      active: false,
    },
    {
      key: 'review',
      label: status === 'rejected' ? t('dashboard.timeline.needsUpdate') : t('dashboard.timeline.review'),
      done: status !== 'pending',
      active: status === 'pending' || status === 'rejected',
    },
    {
      key: 'approved',
      label: t('dashboard.timeline.cardIssued'),
      done: status === 'approved',
      active: status === 'approved',
    },
  ]

  return (
    <div className="mt-5 space-y-3">
      {steps.map((step, index) => (
        <div key={step.key} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ring-1 ${
                step.done
                  ? 'bg-emerald-700 text-white ring-emerald-700'
                  : step.active
                    ? 'bg-amber-100 text-amber-800 ring-amber-200'
                    : 'bg-slate-100 text-slate-500 ring-slate-200'
              }`}
            >
              {step.done ? '✓' : index + 1}
            </span>
            {index < steps.length - 1 ? <span className="h-8 w-px bg-slate-200" /> : null}
          </div>
          <p className="pt-1.5 text-sm font-black text-slate-700">{step.label}</p>
        </div>
      ))}
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  const { t } = useI18n()

  return (
    <div className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || t('common.notProvided')}
      </p>
    </div>
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
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${styles[status]}`}
    >
      {statusLabel(status, t)}
    </span>
  )
}

function statusLabel(status: MemberStatus, t: ReturnType<typeof useI18n>['t']) {
  if (status === 'approved') return t('common.status.approved')
  if (status === 'rejected') return t('common.status.rejected')
  return t('common.status.pending')
}

function getStatusHero(status: MemberStatus) {
  const map = {
    pending: {
      titleKey: 'dashboard.hero.pending.title',
      descriptionKey: 'dashboard.hero.pending.description',
      wrapper: 'border-amber-200 bg-amber-50',
      icon: 'bg-amber-100 text-amber-800',
      symbol: '…',
    },
    approved: {
      titleKey: 'dashboard.hero.approved.title',
      descriptionKey: 'dashboard.hero.approved.description',
      wrapper: 'border-emerald-200 bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-800',
      symbol: '✓',
    },
    rejected: {
      titleKey: 'dashboard.hero.rejected.title',
      descriptionKey: 'dashboard.hero.rejected.description',
      wrapper: 'border-red-200 bg-red-50',
      icon: 'bg-red-100 text-red-800',
      symbol: '!',
    },
  } as const

  return map[status]
}

function maskCnic(value: string | null | undefined) {
  if (!value) return value
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 13) return '*****-*******-*'
  return `${digits.slice(0, 5)}-*******-${digits.slice(-1)}`
}

function maskMobile(value: string | null | undefined) {
  if (!value) return value
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8) return '03*********'
  return `${digits.slice(0, 4)}*****${digits.slice(-2)}`
}


async function loadMembershipPayment(memberId?: string | null) {
  if (!memberId) return null

  const { data, error } = await (supabase as any)
    .from('membership_payments')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle()

  if (error) {
    console.warn('Membership payment status could not be loaded:', error.message)
    return null
  }

  return data
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const locale = language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-PK'
  return date.toLocaleDateString(locale)
}
