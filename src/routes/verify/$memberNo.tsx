import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { verifyMemberAction } from '../../lib/verify/actions'

export const Route = createFileRoute('/verify/$memberNo')({
  component: VerifyMemberPage,
})

type VerifyResult = {
  found: boolean
  verified: boolean
  member: {
    id: string
    member_no: string | null
    full_name: string
    district: string
    taluka: string | null
    designation: string | null
    designation_level: string | null
    designation_area: string | null
    status: 'pending' | 'approved' | 'rejected'
    approved_at: string | null
  } | null
  photoSignedUrl: string | null
}

function VerifyMemberPage() {
  const { memberNo } = Route.useParams()
  const { t, direction, language } = useI18n()

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadVerification()
  }, [memberNo])

  async function loadVerification() {
    setLoading(true)
    setError('')

    try {
      const data = await verifyMemberAction({
        data: {
          memberNo,
        },
      })

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verify.error'))
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <main className="px-4 py-10" dir={direction}>
        <div className="page-wrap rounded-2xl bg-white p-6 shadow-sm">
          {t('verify.loading')}
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 py-10" dir={direction}>
      <div className="page-wrap space-y-6">
        <header className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-emerald-700">
            {t('brand.name')}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {t('verify.title')}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t('verify.description')}
          </p>
        </header>

        {error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!result?.found ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
              ×
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              {t('verify.notFoundTitle')}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {t('verify.notFoundText')}
            </p>

            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
              {memberNo}
            </p>
          </section>
        ) : result.verified && result.member ? (
          <section className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-4xl text-emerald-700">
                ✓
              </div>

              <div>
                <h2 className="text-3xl font-bold text-emerald-700">
                  {t('verify.verifiedTitle')}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {t('verify.verifiedText')}
                </p>
              </div>

              {result.photoSignedUrl ? (
                <img
                  src={result.photoSignedUrl}
                  alt={result.member.full_name}
                  className="h-36 w-36 rounded-2xl object-cover ring-1 ring-slate-200"
                />
              ) : null}

              <div className="grid w-full max-w-2xl gap-4 rounded-2xl bg-slate-50 p-5 text-left md:grid-cols-2">
                <Info label={t('verify.memberName')} value={result.member.full_name} />
                <Info label={t('dashboard.memberNo')} value={result.member.member_no ?? t('common.na')} />
                <Info label={t('dashboard.district')} value={result.member.district} />
                <Info label={t('card.talukaTown')} value={result.member.taluka} />
                <Info label={t('dashboard.designation')} value={result.member.designation} />
                <Info label={t('dashboard.designationLevel')} value={result.member.designation_level} />
                <Info label={t('dashboard.designationArea')} value={result.member.designation_area} />
                <Info
                  label={t('verify.approvedAt')}
                  value={formatDate(result.member.approved_at, language) ?? t('common.na')}
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl text-amber-700">
              !
            </div>

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              {t('verify.notVerifiedTitle')}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {t('verify.notVerifiedText')}
            </p>

            <div className="mx-auto mt-5 max-w-md rounded-xl bg-slate-50 p-4 text-left">
              <Info label={t('dashboard.memberNo')} value={memberNo} />
              <Info
                label={t('admin.table.status')}
                value={result.member?.status ? t(statusKey(result.member.status)) : t('common.na')}
              />
            </div>
          </section>
        )}

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50"
          >
            {t('verify.goHome')}
          </Link>
        </div>
      </div>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  const { t } = useI18n()

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value || t('common.notProvided')}
      </p>
    </div>
  )
}

function statusKey(status: 'pending' | 'approved' | 'rejected') {
  return `common.status.${status}` as const
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return null

  const locale = language === 'ur' ? 'ur-PK' : language === 'sd' ? 'sd-PK' : 'en-PK'
  return new Date(value).toLocaleDateString(locale)
}
