import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  APP_SHORT_NAME,
  BBJF_ICON_PATH,
  BBJF_LEADER_IMAGE_PATH,
  CARD_EXPORT_HEIGHT,
  CARD_EXPORT_WIDTH,
  type MembershipCardMember,
  imageUrlToDataUrl,
} from '../components/MembershipCard'
import { ResponsiveCardPreview } from '../components/ResponsiveCardPreview'
import { useI18n } from '../lib/i18n'
import { exportElementAsPng } from '../lib/shared/card-export'
import { generateQrDataUrl } from '../lib/shared/qrcode'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/card')({
  component: CardPage,
})

type Member = MembershipCardMember
type DownloadTarget = 'front' | 'back' | 'both'

function CardPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()
  const cardRef = useRef<HTMLDivElement>(null)
  const frontCardRef = useRef<HTMLElement>(null)
  const backCardRef = useRef<HTMLElement>(null)

  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<DownloadTarget | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [member, setMember] = useState<Member | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [brandIconUrl, setBrandIconUrl] = useState<string | null>(null)
  const [leaderImageUrl, setLeaderImageUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [verifyUrl, setVerifyUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void loadCard()
  }, [])

  async function loadCard() {
    setLoading(true)
    setError('')

    const [iconDataUrl, leaderDataUrl] = await Promise.all([
      imageUrlToDataUrl(BBJF_ICON_PATH),
      imageUrlToDataUrl(BBJF_LEADER_IMAGE_PATH),
    ])
    setBrandIconUrl(iconDataUrl || BBJF_ICON_PATH)
    setLeaderImageUrl(leaderDataUrl || BBJF_LEADER_IMAGE_PATH)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    const { data, error } = await supabase
      .from('members')
      .select(
        'id, member_no, full_name, father_name, cnic, mobile, district, taluka, address, date_of_birth, gender, education, blood_group, profession, designation, designation_level, designation_area, caste_branch, emergency_contact_name, emergency_contact_relation, emergency_contact_mobile, photo_url, status, approved_at',
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setError(t('card.formNotFound'))
      setLoading(false)
      return
    }

    setMember(data)

    if (data.status !== 'approved' || !data.member_no) {
      setError(t('card.notApproved'))
      setLoading(false)
      return
    }

    const publicVerifyUrl = createPublicVerifyUrl(data.member_no)
    setVerifyUrl(publicVerifyUrl)

    const generatedQr = await createQrDataUrl(publicVerifyUrl)
    setQrUrl(generatedQr)

    if (data.photo_url) {
      const { data: signed } = await supabase.storage
        .from('member-photos')
        .createSignedUrl(data.photo_url, 60 * 60)

      if (signed?.signedUrl) {
        const dataUrl = await imageUrlToDataUrl(signed.signedUrl)
        setPhotoUrl(dataUrl || signed.signedUrl)
      }
    }

    setLoading(false)
  }

  async function handleDownload(target: DownloadTarget) {
    if (!member?.member_no) return

    const exportTarget =
      target === 'front'
        ? frontCardRef.current
        : target === 'back'
          ? backCardRef.current
          : cardRef.current

    if (!exportTarget) return

    setDownloading(target)
    setError('')

    try {
      const suffix = target === 'both' ? 'front-back-card' : `${target}-card`
      await exportElementAsPng(
        exportTarget,
        `${member.member_no}-${APP_SHORT_NAME}-${suffix}.png`,
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
      window.setTimeout(() => setLinkCopied(false), 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to copy link.')
    }
  }

  if (loading) {
    return (
      <main className="px-4 py-10" dir={direction}>
        <div className="page-wrap rounded-2xl bg-white p-6 shadow-sm">
          {t('card.loading')}
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 py-10" dir={direction}>
      <div className="page-wrap space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <Link
            to="/dashboard"
            className="text-sm font-medium text-emerald-700 no-underline"
          >
            {t('common.backToDashboard')}
          </Link>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {t('card.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t('card.description')}
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {member?.status === 'approved' && member.member_no ? (
          <>
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

            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleDownload('front')}
                disabled={Boolean(downloading)}
                className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                {downloading === 'front'
                  ? t('common.downloading')
                  : t('common.downloadFrontPng')}
              </button>

              <button
                type="button"
                onClick={() => void handleDownload('back')}
                disabled={Boolean(downloading)}
                className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                {downloading === 'back'
                  ? t('common.downloading')
                  : t('common.downloadBackPng')}
              </button>

              <button
                type="button"
                onClick={() => void handleDownload('both')}
                disabled={Boolean(downloading)}
                className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
              >
                {downloading === 'both'
                  ? t('common.downloading')
                  : t('common.downloadFrontBackPng')}
              </button>

              <button
                type="button"
                onClick={() => void handleCopyVerificationLink()}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {linkCopied ? t('common.copied') : t('common.copyVerificationLink')}
              </button>

              <Link
                to="/verify/$memberNo"
                params={{ memberNo: member.member_no }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50"
              >
                {t('common.openVerificationPage')}
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-slate-700">{t('card.availableAfterApproval')}</p>
          </div>
        )}
      </div>
    </main>
  )
}

function createPublicVerifyUrl(memberNo: string) {
  const encodedMemberNo = encodeURIComponent(memberNo)
  return `${window.location.origin}/verify/${encodedMemberNo}`
}

async function createQrDataUrl(value: string) {
  return generateQrDataUrl(value, {
    width: 280,
    margin: 1,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  })
}
