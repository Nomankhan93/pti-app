import { forwardRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import { useI18n } from '../lib/i18n'

export const APP_NAME = 'Bilawal Bhutto Jayala Federation'
export const APP_SHORT_NAME = 'BBJF'
export const BBJF_ICON_PATH = '/bbjf-icon-512.png'
export const BBJF_LEADER_IMAGE_PATH = '/card-assets/bilawal-bhutto-card-leader.png'
export const BBJF_AUTHORIZED_SIGNATURE_IMAGE_PATH = '/bbjf/authorized-signature-taj-muhammad-bhurgai.png'
export const BBJF_AUTHORIZED_SIGNATORY_NAME = 'Taj Muhammad Bhurgai'
export const BBJF_AUTHORIZED_SIGNATORY_TITLE = 'Provincial President, Sindh'
export const CARD_EXPORT_WIDTH = 1016
export const CARD_EXPORT_HEIGHT = 638

const CARD_SIDE_STYLE: CSSProperties = {
  width: CARD_EXPORT_WIDTH,
  height: CARD_EXPORT_HEIGHT,
}

export type MembershipCardMember = {
  id: string
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
  photo_url?: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_at: string | null
}

type MembershipCardProps = {
  member: MembershipCardMember
  photoUrl: string | null
  brandIconUrl: string | null
  leaderImageUrl?: string | null
  qrUrl: string | null
  verifyUrl: string
  frontRef?: Ref<HTMLElement>
  backRef?: Ref<HTMLElement>
}

export const MembershipCard = forwardRef<HTMLDivElement, MembershipCardProps>(
  function MembershipCard(
    { member, photoUrl, brandIconUrl, leaderImageUrl, qrUrl, verifyUrl, frontRef, backRef },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="mx-auto space-y-5 rounded-[2rem] bg-white p-4 shadow-2xl ring-1 ring-slate-200"
        style={{ width: CARD_EXPORT_WIDTH + 32 }}
      >
        <CardFront
          ref={frontRef}
          member={member}
          photoUrl={photoUrl}
          brandIconUrl={brandIconUrl}
          leaderImageUrl={leaderImageUrl}
          qrUrl={qrUrl}
          verifyUrl={verifyUrl}
        />

        <CardBack
          ref={backRef}
          member={member}
          brandIconUrl={brandIconUrl}
        />
      </div>
    )
  },
)

const CardFront = forwardRef<HTMLElement, {
  member: MembershipCardMember
  photoUrl: string | null
  brandIconUrl: string | null
  leaderImageUrl?: string | null
  qrUrl: string | null
  verifyUrl: string
}>(function CardFront(
  { member, photoUrl, brandIconUrl, leaderImageUrl, qrUrl, verifyUrl },
  ref,
) {
  const { t, direction, language } = useI18n()
  const expiryDate = formatExpiryDate(member.approved_at, language)

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-white shadow-xl"
      dir={direction}
      style={CARD_SIDE_STYLE}
    >
      <CardWatermark brandIconUrl={brandIconUrl} />

      <div className="relative h-[214px] overflow-hidden bg-slate-950 px-7 py-6 text-white">
        <FlagStripes />
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/40 to-black/15" />
        <div className="absolute inset-y-0 right-0 w-[36%] bg-emerald-800/60" />
        <LeaderPortrait leaderImageUrl={leaderImageUrl} />

        <div className="relative z-10 flex h-full items-start gap-5">
          <div className="flex h-full shrink-0 flex-col items-center justify-between">
            <LogoMark brandIconUrl={brandIconUrl} />

            <div className="rounded-2xl border border-white/25 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-lg">
              {t('card.verified')}
            </div>
          </div>

          <div className="min-w-0 max-w-[610px] pt-1">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-white/80">
              {APP_SHORT_NAME} · {t('card.digitalMemberId')}
            </p>
            <h2 className="mt-3 text-[42px] font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-sm">
              {APP_NAME}
            </h2>
            <p className="mt-3 max-w-[480px] text-sm font-semibold text-white/85">
              {t('card.officialVerified')}
            </p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-[220px_minmax(0,1fr)_220px] gap-6 p-6">
        <aside className="space-y-4">
          <div className="rounded-[1.65rem] bg-gradient-to-br from-red-600 via-white to-green-600 p-[4px] shadow-lg">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={member.full_name}
                className="h-[220px] w-full rounded-[1.45rem] border-4 border-white bg-slate-100 object-cover object-top"
                draggable={false}
              />
            ) : (
              <div className="flex h-[220px] w-full items-center justify-center rounded-[1.45rem] border-4 border-white bg-slate-100 text-sm font-bold text-slate-500">
                {t('common.noPhoto')}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 text-center text-white shadow-lg ring-1 ring-red-500/30">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60">
              {t('card.memberNo')}
            </p>
            <p className="mt-2 break-all text-xl font-black">
              {member.member_no || t('common.notProvided')}
            </p>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              {t('card.memberName')}
            </p>
            <h3 className="mt-2 text-4xl font-black leading-tight text-slate-950">
              {member.full_name}
            </h3>
            <div className="mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-red-600 via-black to-green-600" />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Info label={t('card.fatherName')} value={member.father_name} />
            <Info label={t('dashboard.designation')} value={member.designation} />
            <Info label={t('dashboard.designationLevel')} value={member.designation_level} />
            <Info label={t('dashboard.designationArea')} value={member.designation_area} />
            <Info
              label={t('card.approvedDate')}
              value={formatDate(member.approved_at, language)}
            />
            <Info
              label={t('card.expiryDate')}
              value={expiryDate}
            />
            <Info
              label={t('admin.table.status')}
              value={statusLabel(member.status, t)}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Verification Notice
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
              {expiryDate
                ? t('card.validityNoticeWithExpiry').replace('{date}', expiryDate)
                : t('card.validityNotice')}
            </p>
          </div>
        </main>

        <aside className="flex flex-col items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 text-center shadow-lg">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={t('card.front.qrAlt')}
              className="h-40 w-40 rounded-xl bg-white p-2 ring-1 ring-slate-200"
              draggable={false}
            />
          ) : (
            <div className="h-40 w-40 rounded-xl bg-slate-100 ring-1 ring-slate-200" />
          )}

          <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            {t('card.scanToVerify')}
          </p>
          <p className="mt-2 line-clamp-3 break-all text-[11px] font-bold leading-4 text-slate-500">
            {formatVerifyUrlForDisplay(verifyUrl)}
          </p>
        </aside>
      </div>
    </section>
  )
})

const CardBack = forwardRef<HTMLElement, {
  member: MembershipCardMember
  brandIconUrl: string | null
}>(function CardBack(
  { member, brandIconUrl },
  ref,
) {
  const { t, direction, language } = useI18n()
  const expiryDate = formatExpiryDate(member.approved_at, language)

  return (
    <section
      ref={ref}
      className="relative isolate flex flex-col overflow-hidden rounded-[1.75rem] border border-slate-900/10 bg-white shadow-xl"
      dir={direction}
      style={CARD_SIDE_STYLE}
    >
      <header className="relative h-[142px] shrink-0 overflow-hidden bg-slate-950 px-6 py-5 text-white">
        <FlagStripes />
        <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-black/55 to-black/20" />
        <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-white/10" />
        <div className="absolute inset-x-0 bottom-0 h-[4px] bg-gradient-to-r from-red-700 via-black to-green-700" />

        <div className="relative flex h-full items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <LogoMark brandIconUrl={brandIconUrl} compact />

            <div className="min-w-0 max-w-[640px]">
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-white/75">
                {APP_SHORT_NAME} · {t('card.back.sideLabel')}
              </p>
              <h2 className="mt-2 whitespace-nowrap text-[36px] font-black uppercase leading-none tracking-tight text-white">
                {t('card.back.cardholderDetails')}
              </h2>
              <p className="mt-2 text-[13px] font-semibold leading-5 text-white/80">
                {t('card.back.detailsSubtitle')}
              </p>
            </div>
          </div>

          <div className="min-w-[132px] rounded-2xl border border-yellow-300/80 bg-yellow-300 px-4 py-3 text-center text-[13px] font-black uppercase tracking-wide text-slate-950 shadow-lg">
            {t('card.back.cardDetails')}
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
        <CardWatermark brandIconUrl={brandIconUrl} />

        <div className="relative flex h-full min-h-0 p-4">
          <main className="grid h-full min-h-0 w-full grid-cols-[1.08fr_1fr] grid-rows-[0.94fr_1.06fr_1.16fr] gap-3">
            <BackPanel title={t('card.back.residentialAddress')} tone="gold">
              <p className="line-clamp-3 break-words text-[15px] font-black leading-snug text-slate-950">
                {member.address || t('common.notProvided')}
              </p>
              <p className="mt-2 break-words text-[13px] font-bold text-slate-800">
                {[member.taluka, member.district].filter(Boolean).join(', ') ||
                  t('common.notProvided')}
              </p>
            </BackPanel>

            <BackPanel title={t('card.back.emergencyContact')}>
              {member.emergency_contact_name || member.emergency_contact_mobile ? (
                <>
                  <p className="line-clamp-1 break-words text-[15px] font-black text-slate-950">
                    {member.emergency_contact_name || t('common.notProvided')}
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-slate-700">
                    {member.emergency_contact_relation || t('common.notProvided')}
                  </p>
                  <p className="mt-2 text-[15px] font-black text-slate-950">
                    {formatMobile(member.emergency_contact_mobile) || t('common.notProvided')}
                  </p>
                </>
              ) : (
                <p className="text-[13px] font-black text-slate-950">
                  {t('common.notProvided')}
                </p>
              )}
            </BackPanel>

            <BackPanel
              title={t('card.back.memberInfo')}
              contentClassName="flex items-center"
            >
              <div className="grid w-full grid-cols-3 gap-x-5 gap-y-3">
                <MiniInfo label={t('card.back.dob')} value={formatDate(member.date_of_birth, language)} />
                <MiniInfo label={t('dashboard.gender')} value={member.gender} />
                <MiniInfo label={t('card.back.blood')} value={member.blood_group} />
                <MiniInfo label={t('dashboard.education')} value={member.education} />
                <MiniInfo label={t('dashboard.designation')} value={member.designation || 'Member'} />
                <MiniInfo label={t('dashboard.cnic')} value={formatCnic(member.cnic)} />
                <MiniInfo label={t('card.mobile')} value={formatMobile(member.mobile)} />
                <MiniInfo label={t('card.caste')} value={member.caste_branch} />
                <MiniInfo label={t('card.expiryDate')} value={expiryDate} />
              </div>
            </BackPanel>

            <BackPanel
              title={t('card.back.verificationInstructions')}
              contentClassName="flex flex-col justify-center"
            >
              <p>{t('card.back.scanInstruction')}</p>
              <p className="mt-1.5">{t('card.back.matchInstruction')}</p>
            </BackPanel>

            <BackPanel title={t('card.back.terms')}>
              <ul className="list-disc space-y-1.5 pl-4">
                <li>{t('card.back.term1').replace(/^\d+\.\s*/, '')}</li>
                <li>{t('card.back.term2').replace(/^\d+\.\s*/, '')}</li>
                <li>{t('card.back.term3').replace(/^\d+\.\s*/, '')}</li>
              </ul>
            </BackPanel>

            <BackPanel
              title={t('card.back.issuingAuthority')}
              tone="dark"
              contentClassName="flex flex-1 flex-col justify-end"
            >
              <div className="relative h-[70px] overflow-visible">
                <img
                  src={BBJF_AUTHORIZED_SIGNATURE_IMAGE_PATH}
                  alt={`${BBJF_AUTHORIZED_SIGNATORY_NAME} authorized signature`}
                  className="pointer-events-none absolute left-[60%] top-[-18px] h-[98px] w-[300px] -translate-x-1/2 object-contain object-center mix-blend-multiply"
                  draggable={false}
                />
              </div>

              <div className="-mt-1.5 h-px w-full bg-slate-500" />

              <p className="mt-2.5 text-[12px] font-black uppercase tracking-[0.08em] text-slate-600">
                {t('card.back.authorizedSignature')}
              </p>
              <p className="mt-0.5 text-[14px] font-black leading-tight text-slate-950">
                {BBJF_AUTHORIZED_SIGNATORY_NAME}
              </p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">
                {BBJF_AUTHORIZED_SIGNATORY_TITLE}
              </p>
            </BackPanel>
          </main>
        </div>
      </div>

      <footer className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-2">
        <p className="text-[10.5px] font-semibold leading-4 text-slate-500">
          {t('card.back.validActive')}
          {expiryDate ? ` ${t('card.back.expiryNotice').replace('{date}', expiryDate)}` : ''}
        </p>
      </footer>
    </section>
  )
})

function FlagStripes() {
  return (
    <>
      <div className="absolute inset-y-0 left-0 w-1/3 bg-red-700" />
      <div className="absolute inset-y-0 left-1/3 w-1/3 bg-black" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-green-700" />
    </>
  )
}

function LogoMark({
  brandIconUrl,
  compact = false,
}: {
  brandIconUrl: string | null
  compact?: boolean
}) {
  const sizeClass = compact ? 'h-16 w-16' : 'h-20 w-20'

  if (!brandIconUrl) {
    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-sm font-black text-white shadow-xl`}
      >
        {APP_SHORT_NAME}
      </div>
    )
  }

  return (
    <img
      src={brandIconUrl}
      alt={`${APP_SHORT_NAME} logo`}
      className={`${sizeClass} shrink-0 rounded-full border-4 border-white bg-white object-cover shadow-xl`}
      draggable={false}
    />
  )
}

function LeaderPortrait({ leaderImageUrl }: { leaderImageUrl?: string | null }) {
  const src = leaderImageUrl || BBJF_LEADER_IMAGE_PATH

  return (
    <div className="pointer-events-none absolute bottom-0 right-0 z-[6] h-full w-[38%] overflow-hidden">
      <img
        src={src}
        alt=""
        className="absolute bottom-0 right-[-6px] h-[198px] w-[332px] object-contain object-bottom object-right drop-shadow-[0_18px_30px_rgba(0,0,0,0.28)]"
        draggable={false}
      />
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-950/40 to-transparent" />
    </div>
  )
}

function statusLabel(
  status: MembershipCardMember['status'],
  t: ReturnType<typeof useI18n>['t'],
) {
  if (status === 'approved') return t('common.status.approved')
  if (status === 'rejected') return t('common.status.rejected')
  return t('common.status.pending')
}


function MiniInfo({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  const { t } = useI18n()

  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-wide text-emerald-800">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-black leading-[1.15] text-slate-950">
        {value || t('common.notProvided')}
      </p>
    </div>
  )
}

function BackPanel({
  title,
  children,
  tone = 'light',
  contentClassName = '',
}: {
  title: string
  children: ReactNode
  tone?: 'light' | 'gold' | 'dark'
  contentClassName?: string
}) {
  const toneClass =
    tone === 'gold'
      ? 'border-yellow-300 bg-yellow-50/95'
      : tone === 'dark'
        ? 'border-slate-300 bg-slate-50/95'
        : 'border-slate-200 bg-white/90'

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-[1.05rem] border p-3 shadow-sm ${toneClass}`}
    >
      <h3 className="shrink-0 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
        {title}
      </h3>
      <div
        className={`mt-2 min-h-0 text-[12px] font-semibold leading-[1.35] text-slate-700 ${contentClassName}`}
      >
        {children}
      </div>
    </section>
  )
}

function CardWatermark({ brandIconUrl }: { brandIconUrl: string | null }) {
  if (!brandIconUrl) return null

  return (
    <>
      <img
        src={brandIconUrl}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.05] mix-blend-multiply"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-white/80" />
      <img
        src={brandIconUrl}
        alt=""
        className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover opacity-[0.07]"
        draggable={false}
      />
    </>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  const { t } = useI18n()

  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-[14px] font-black leading-snug text-slate-950">
        {value || t('common.notProvided')}
      </p>
    </div>
  )
}

function formatExpiryDate(value: string | null | undefined, language: string) {
  if (!value) return null

  const approvedDate = new Date(value)
  if (Number.isNaN(approvedDate.getTime())) return null

  const expiryDate = new Date(approvedDate)
  expiryDate.setFullYear(expiryDate.getFullYear() + 1)

  return formatDate(expiryDate.toISOString(), language)
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const locale = language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-PK'
  return date.toLocaleDateString(locale)
}

function formatCnic(value: string | null | undefined) {
  if (!value) return null

  const digits = value.replace(/\D/g, '')
  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
  }

  return value
}

function formatMobile(value: string | null | undefined) {
  if (!value) return null

  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('92') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length === 11) return digits
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`

  return value
}

function formatVerifyUrlForDisplay(value: string | null | undefined) {
  if (!value) return ''

  try {
    const url = new URL(value)
    return `${url.host}${url.pathname}`
  } catch {
    return value.replace(/^https?:\/\//, '')
  }
}

export async function imageUrlToDataUrl(url: string) {
  try {
    const response = await fetch(url)
    const blob = await response.blob()

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
