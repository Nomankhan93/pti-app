import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  IdCard,
  ImageOff,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { AdminShell } from '../../../../components/admin/AdminShell'
import {
  APP_SHORT_NAME,
  BBJF_ICON_PATH,
  BBJF_LEADER_IMAGE_PATH,
  CARD_EXPORT_HEIGHT,
  CARD_EXPORT_WIDTH,
  type MembershipCardMember,
  imageUrlToDataUrl,
} from '../../../../components/MembershipCard'
import { ResponsiveCardPreview } from '../../../../components/ResponsiveCardPreview'
import { useI18n, type TranslationKey } from '../../../../lib/i18n'
import { exportElementAsPng } from '../../../../lib/shared/card-export'
import { generateQrDataUrl } from '../../../../lib/shared/qrcode'
import { supabase } from '../../../../lib/supabase/client'

export const Route = createFileRoute('/admin/members/$id/card')({
  component: AdminMemberCardPage,
})

type Member = MembershipCardMember & {
  user_id: string
  rejection_reason: string | null
  reviewed_at: string | null
  created_at: string
}

type DownloadTarget = 'front' | 'back' | 'both' | null

type AdminAccessResult =
  | { ok: true }
  | { ok: false; redirectTo: '/login' | '/dashboard' }

const MEMBER_PHOTO_BUCKET = 'member-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60
const MEMBERSHIP_REVIEW_ROLES = ['admin'] as const

const statusLabelKeys: Record<Member['status'], TranslationKey> = {
  pending: 'common.status.pending',
  approved: 'common.status.approved',
  rejected: 'common.status.rejected',
}

function AdminMemberCardPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { t, direction } = useI18n()

  const cardRef = useRef<HTMLDivElement>(null)
  const frontCardRef = useRef<HTMLElement>(null)
  const backCardRef = useRef<HTMLElement>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState<DownloadTarget>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [brandIconUrl, setBrandIconUrl] = useState<string | null>(null)
  const [leaderImageUrl, setLeaderImageUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [verifyUrl, setVerifyUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cardReady = Boolean(member?.status === 'approved' && member.member_no && qrUrl)

  const loadMemberCard = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (silent) setRefreshing(true)
      else setLoading(true)

      setError('')
      setSuccess('')

      if (!silent) {
        setMember(null)
        setPhotoUrl(null)
        setQrUrl(null)
        setVerifyUrl('')
      }

      try {
        const access = await ensureAdminAccess()

        if (!access.ok) {
          await navigate({ to: access.redirectTo })
          return
        }

        const [iconDataUrl, leaderDataUrl] = await Promise.all([
          imageUrlToDataUrl(BBJF_ICON_PATH),
          imageUrlToDataUrl(BBJF_LEADER_IMAGE_PATH),
        ])

        setBrandIconUrl(iconDataUrl || BBJF_ICON_PATH)
        setLeaderImageUrl(leaderDataUrl || BBJF_LEADER_IMAGE_PATH)

        const data = await fetchMemberForCard(id)

        if (!data) {
          throw new Error('Member record not found.')
        }

        setMember(data)

        if (data.status !== 'approved' || !data.member_no) {
          setPhotoUrl(null)
          setQrUrl(null)
          setVerifyUrl('')
          setError(t('admin.card.onlyApproved'))
          return
        }

        const publicVerifyUrl = createPublicVerifyUrl(data.member_no)
        setVerifyUrl(publicVerifyUrl)

        const generatedQr = await generateQrDataUrl(publicVerifyUrl, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#111827',
            light: '#ffffff',
          },
        })
        setQrUrl(generatedQr)

        if (data.photo_url) {
          const { data: signed, error: signedError } = await supabase.storage
            .from(MEMBER_PHOTO_BUCKET)
            .createSignedUrl(data.photo_url, SIGNED_URL_TTL_SECONDS)

          if (signedError) {
            throw signedError
          }

          if (signed?.signedUrl) {
            const dataUrl = await imageUrlToDataUrl(signed.signedUrl)
            setPhotoUrl(dataUrl || signed.signedUrl)
          } else {
            setPhotoUrl(null)
          }
        } else {
          setPhotoUrl(null)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load admin card preview.',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id, navigate, t],
  )

  useEffect(() => {
    void loadMemberCard()
  }, [loadMemberCard])

  async function handleDownload(target: Exclude<DownloadTarget, null>) {
    if (!member?.member_no) return

    const exportTarget =
      target === 'front'
        ? frontCardRef.current
        : target === 'back'
          ? backCardRef.current
          : cardRef.current

    if (!exportTarget) {
      setError('Unable to prepare card for download. Please refresh and try again.')
      return
    }

    setDownloading(target)
    setError('')
    setSuccess('')

    try {
      const suffix = target === 'both' ? 'front-back-card' : `${target}-card`

      await exportElementAsPng(
        exportTarget,
        `${member.member_no}-${APP_SHORT_NAME}-admin-${suffix}.png`,
        target === 'both'
          ? undefined
          : {
              width: CARD_EXPORT_WIDTH,
              height: CARD_EXPORT_HEIGHT,
              canvasWidth: CARD_EXPORT_WIDTH * 2,
              canvasHeight: CARD_EXPORT_HEIGHT * 2,
              pixelRatio: 2,
            },
      )

      setSuccess(
        target === 'both'
          ? 'Front and back sides downloaded successfully.'
          : `${capitalize(target)} side downloaded successfully.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('card.downloadError'))
    } finally {
      setDownloading(null)
    }
  }

  async function handleCopyVerificationLink() {
    if (!verifyUrl) return

    try {
      await navigator.clipboard.writeText(verifyUrl)
      setLinkCopied(true)
      setSuccess('Verification link copied.')
      setError('')
      window.setTimeout(() => setLinkCopied(false), 1600)
    } catch {
      setError('Unable to copy verification link.')
    }
  }

  if (loading) {
    return (
      <AdminShell title={t('admin.card.title')} subtitle={t('admin.card.loading')}>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70" dir={direction}>
          <div className="flex items-center gap-3 text-sm font-black text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            {t('admin.card.loading')}
          </div>
        </div>
      </AdminShell>
    )
  }

  if (!member) {
    return (
      <AdminShell title={t('admin.card.title')} subtitle={t('admin.card.onlyApproved')}>
        <EmptyCardState
          title={t('common.memberNotFound')}
          message="This member record could not be loaded. Please return to the admin panel and try again."
          action={
            <Link
              to="/admin"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black !text-white no-underline shadow-sm transition hover:bg-black hover:!text-white"
              style={{ color: '#ffffff' }}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.backToAdmin')}
            </Link>
          }
        />
      </AdminShell>
    )
  }

  return (
    <AdminShell title={t('admin.card.title')} subtitle={member.full_name}>
      <div className="space-y-6" dir={direction}>
        <header className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-red-50 p-5 sm:p-6">
            <div className="flex flex-wrap gap-3 text-sm font-black">
              <Link to="/admin" className="text-emerald-700 no-underline hover:text-emerald-800">
                ← {t('common.backToAdmin')}
              </Link>
              <Link
                to="/admin/members/$id"
                params={{ id: member.id }}
                className="text-emerald-700 no-underline hover:text-emerald-800"
              >
                {t('common.backToMemberDetail')}
              </Link>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                  Admin Card Preview
                </p>
                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {t('admin.card.title')}
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Preview and download the same front/back digital membership card that approved members can access from their dashboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={member.status} label={t(statusLabelKeys[member.status])} />
                <button
                  type="button"
                  onClick={() => void loadMemberCard({ silent: true })}
                  disabled={refreshing || downloading !== null}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Member" value={member.full_name} icon={<QrCode className="h-4 w-4" />} />
            <SummaryItem label="Status" value={t(statusLabelKeys[member.status])} icon={<ShieldCheck className="h-4 w-4" />} />
            <SummaryItem label="Member No" value={member.member_no || t('dashboard.notIssuedYet')} icon={<IdCard className="h-4 w-4" />} />
            <SummaryItem label="Card State" value={cardReady ? 'Ready' : 'Not available'} icon={<CreditCard className="h-4 w-4" />} />
          </div>
        </header>

        {error ? (
          <AlertBox tone="error" icon={<AlertCircle className="h-5 w-5" />}>
            {error}
          </AlertBox>
        ) : null}

        {success ? (
          <AlertBox tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>
            {success}
          </AlertBox>
        ) : null}

        {cardReady ? (
          <>
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <ResponsiveCardPreview
                className="rounded-[2rem] bg-white p-2 shadow-sm ring-1 ring-slate-200/70 sm:p-4"
                cardRef={cardRef}
                frontRef={frontCardRef}
                backRef={backCardRef}
                member={member}
                photoUrl={photoUrl}
                brandIconUrl={brandIconUrl}
                leaderImageUrl={leaderImageUrl}
                qrUrl={qrUrl}
                verifyUrl={verifyUrl}
              />

              <aside className="space-y-4">
                <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-100">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-950">Card is ready</h2>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        This member is approved and has a membership number. The QR code points to the public verification page.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Verification Link</p>
                  <p className="mt-2 break-all rounded-2xl bg-slate-50 p-3 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                    {verifyUrl}
                  </p>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopyVerificationLink()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4" />
                      {linkCopied ? t('common.copied') : t('common.copyVerificationLink')}
                    </button>

                    <Link
                      to="/verify/$memberNo"
                      params={{ memberNo: member.member_no ?? '' }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 no-underline shadow-sm transition hover:bg-emerald-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t('common.openVerificationPage')}
                    </Link>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Download Card</p>

                  <div className="mt-3 grid gap-2">
                    <DownloadButton
                      label={t('common.downloadFrontPng')}
                      loadingLabel={t('common.downloading')}
                      loading={downloading === 'front'}
                      disabled={downloading !== null}
                      onClick={() => void handleDownload('front')}
                      tone="primary"
                    />
                    <DownloadButton
                      label={t('common.downloadBackPng')}
                      loadingLabel={t('common.downloading')}
                      loading={downloading === 'back'}
                      disabled={downloading !== null}
                      onClick={() => void handleDownload('back')}
                      tone="dark"
                    />
                    <DownloadButton
                      label={t('common.downloadFrontBackPng')}
                      loadingLabel="Downloading both..."
                      loading={downloading === 'both'}
                      disabled={downloading !== null}
                      onClick={() => void handleDownload('both')}
                      tone="gold"
                    />
                  </div>
                </div>
              </aside>
            </section>
          </>
        ) : (
          <EmptyCardState
            title="Digital card is not available yet"
            message={
              member.status === 'approved'
                ? 'This member is approved, but the member number is not available yet. The card will become available after member number issuance.'
                : 'This digital card is available only after admin approval and member number issuance.'
            }
            action={
              <Link
                to="/admin/members/$id"
                params={{ id: member.id }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black !text-white no-underline shadow-sm transition hover:bg-black hover:!text-white"
                style={{ color: '#ffffff' }}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.backToMemberDetail')}
              </Link>
            }
          />
        )}
      </div>
    </AdminShell>
  )
}

async function ensureAdminAccess(): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, redirectTo: '/login' }
  }

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('role', MEMBERSHIP_REVIEW_ROLES[0])
    .maybeSingle()

  if (roleError || !roles) {
    return { ok: false, redirectTo: '/dashboard' }
  }

  return { ok: true }
}

async function fetchMemberForCard(id: string) {
  const { data, error } = await supabase
    .from('members')
    .select(
      [
        'id',
        'user_id',
        'member_no',
        'full_name',
        'father_name',
        'cnic',
        'mobile',
        'district',
        'taluka',
        'address',
        'date_of_birth',
        'gender',
        'education',
        'blood_group',
        'profession',
        'designation',
        'designation_level',
        'designation_area',
        'caste_branch',
        'emergency_contact_name',
        'emergency_contact_relation',
        'emergency_contact_mobile',
        'photo_url',
        'status',
        'rejection_reason',
        'reviewed_at',
        'approved_at',
        'created_at',
      ].join(', '),
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error

  return data as Member | null
}

function createPublicVerifyUrl(memberNo: string) {
  const encodedMemberNo = encodeURIComponent(memberNo)
  const configuredOrigin = String(
    import.meta.env.VITE_PUBLIC_SITE_URL ||
      import.meta.env.VITE_SITE_URL ||
      import.meta.env.VITE_APP_URL ||
      '',
  ).replace(/\/+$/, '')

  if (configuredOrigin) return `${configuredOrigin}/verify/${encodedMemberNo}`

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/verify/${encodedMemberNo}`
  }

  return `/verify/${encodedMemberNo}`
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
        </div>
        <span className="text-emerald-700">{icon}</span>
      </div>
    </div>
  )
}

function StatusPill({ status, label }: { status: Member['status']; label: string }) {
  const classes =
    status === 'approved'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : status === 'rejected'
        ? 'bg-red-50 text-red-700 ring-red-200'
        : 'bg-amber-50 text-amber-700 ring-amber-200'

  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ring-1 ${classes}`}>
      {label}
    </span>
  )
}

function AlertBox({
  tone,
  icon,
  children,
}: {
  tone: 'error' | 'success'
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const classes =
    tone === 'error'
      ? 'bg-red-50 text-red-700 ring-red-100'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-100'

  return (
    <div className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-bold ring-1 ${classes}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function EmptyCardState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70 sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
        <ImageOff className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">{message}</p>
      <div className="mt-6 flex justify-center">{action}</div>
    </section>
  )
}

function DownloadButton({
  label,
  loadingLabel,
  loading,
  disabled,
  onClick,
  tone,
}: {
  label: string
  loadingLabel: string
  loading: boolean
  disabled: boolean
  onClick: () => void
  tone: 'primary' | 'dark' | 'gold'
}) {
  const classes =
    tone === 'primary'
      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
      : tone === 'dark'
        ? 'bg-slate-950 text-white hover:bg-black'
        : 'bg-amber-400 text-slate-950 hover:bg-amber-300'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${classes}`}
      style={tone === 'dark' || tone === 'primary' ? { color: '#ffffff' } : undefined}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? loadingLabel : label}
    </button>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
