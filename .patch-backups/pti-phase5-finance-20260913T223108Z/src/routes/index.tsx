import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  Globe2,
  IdCard,
  Layers3,
  MapPinned,
  QrCode,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PTI_LOGO_PATH } from '../components/layout/BrandMark'
import { useAuthRole } from '../hooks/useAuthRole'
import { useI18n } from '../lib/i18n'

export const Route = createFileRoute('/')({
  component: HomePage,
})

type Slide = {
  src: string
  title: string
  text: string
}

type HomeCopy = {
  eyebrow: string
  title: string
  highlight: string
  lede: string
  primary: string
  secondary: string
  proof: string[]
  modulesKicker: string
  modulesTitle: string
  modulesText: string
  nationwideKicker: string
  nationwideTitle: string
  nationwideText: string
  scope: string[]
  modules: Array<{ title: string; text: string }>
  slides: Slide[]
}

const HOME_COPY: Record<'en' | 'ur', HomeCopy> = {
  en: {
    eyebrow: 'Pakistan Tehreek-e-Insaf',
    title: 'One digital platform for',
    highlight: 'membership and field operations.',
    lede:
      'A secure PTI platform for digital membership, volunteer registration, organization-wide coordination, teams, duties and participation tracking — built for nationwide scale.',
    primary: 'Join PTI',
    secondary: 'Open Dashboard',
    proof: ['Free self-issued membership', 'Role-based access', 'Audited operations'],
    modulesKicker: 'Built as one connected system',
    modulesTitle: 'From member registration to on-ground coordination.',
    modulesText:
      'Every module uses the same identity, geography and permission foundation so leadership and coordinators work from one consistent source of truth.',
    nationwideKicker: 'Nationwide structure',
    nationwideTitle: 'Central visibility. Local control.',
    nationwideText:
      'The platform follows Pakistan’s administrative hierarchy and keeps coordinator access scoped to the organization units they are authorized to manage.',
    scope: ['Central', 'Province / Territory', 'Division', 'District', 'Tehsil / Taluka'],
    modules: [
      {
        title: 'Digital Membership',
        text: 'Free self-registration, automatic PTI member number, digital card and public QR verification.',
      },
      {
        title: 'Volunteer Network',
        text: 'Skills, availability, geography and coordinator workbench for organized volunteer deployment.',
      },
      {
        title: 'Operations & Duties',
        text: 'Create operations, teams, shifts and duties with scoped coordinator responsibility.',
      },
      {
        title: 'Attendance & Participation',
        text: 'Secure QR check-in, manual attendance and long-term volunteer participation history.',
      },
    ],
    slides: [
      {
        src: '/home-slides/pti-slide-01.jpg',
        title: 'Digital Membership',
        text: 'A verified PTI member identity with automatic issuance and QR-enabled digital card.',
      },
      {
        src: '/home-slides/pti-slide-02.jpg',
        title: 'Volunteer Coordination',
        text: 'Organize people by geography, skills and availability through controlled coordinator access.',
      },
      {
        src: '/home-slides/pti-slide-03.jpg',
        title: 'Field Operations',
        text: 'Create teams, shifts and duties for campaigns, gatherings and operational activities.',
      },
      {
        src: '/home-slides/pti-slide-04.jpg',
        title: 'Participation Tracking',
        text: 'Track check-in, attendance and completed duties while preserving a clear audit trail.',
      },
    ],
  },
  ur: {
    eyebrow: 'پاکستان تحریکِ انصاف',
    title: 'ممبرشپ اور فیلڈ آپریشنز کے لیے',
    highlight: 'ایک متحد ڈیجیٹل پلیٹ فارم۔',
    lede:
      'پی ٹی آئی کے لیے محفوظ ڈیجیٹل ممبرشپ، رضاکار رجسٹریشن، تنظیمی رابطہ، ٹیمیں، ذمہ داریاں اور شرکت کی نگرانی — پاکستان بھر کے استعمال کے لیے۔',
    primary: 'پی ٹی آئی جوائن کریں',
    secondary: 'ڈیش بورڈ کھولیں',
    proof: ['مفت خودکار ممبرشپ', 'رول بیسڈ رسائی', 'آڈٹ شدہ آپریشنز'],
    modulesKicker: 'ایک مربوط نظام',
    modulesTitle: 'ممبر رجسٹریشن سے فیلڈ کوآرڈینیشن تک۔',
    modulesText:
      'تمام ماڈیولز ایک ہی شناخت، جغرافیہ اور اجازت کے نظام پر کام کرتے ہیں تاکہ قیادت اور کوآرڈینیٹرز ایک قابل اعتماد پلیٹ فارم استعمال کریں۔',
    nationwideKicker: 'پاکستان بھر کا تنظیمی ڈھانچہ',
    nationwideTitle: 'مرکزی نگرانی، مقامی اختیار۔',
    nationwideText:
      'پلیٹ فارم پاکستان کی انتظامی درجہ بندی کے مطابق ہے اور ہر کوآرڈینیٹر کو صرف اپنے مجاز تنظیمی دائرے تک رسائی دیتا ہے۔',
    scope: ['مرکزی', 'صوبہ / علاقہ', 'ڈویژن', 'ضلع', 'تحصیل / تعلقہ'],
    modules: [
      {
        title: 'ڈیجیٹل ممبرشپ',
        text: 'مفت رجسٹریشن، خودکار PTI ممبر نمبر، ڈیجیٹل کارڈ اور QR تصدیق۔',
      },
      {
        title: 'رضاکار نیٹ ورک',
        text: 'مہارت، دستیابی، جغرافیہ اور منظم رضاکار تعیناتی کے لیے کوآرڈینیٹر ورک بینچ۔',
      },
      {
        title: 'آپریشنز اور ذمہ داریاں',
        text: 'آپریشنز، ٹیمیں، شفٹس اور ذمہ داریاں مجاز کوآرڈینیٹرز کے ذریعے منظم کریں۔',
      },
      {
        title: 'حاضری اور شرکت',
        text: 'محفوظ QR چیک اِن، دستی حاضری اور رضاکار کی شرکت کی مکمل تاریخ۔',
      },
    ],
    slides: [
      {
        src: '/home-slides/pti-slide-01.jpg',
        title: 'ڈیجیٹل ممبرشپ',
        text: 'خودکار اجراء اور QR کارڈ کے ساتھ تصدیق شدہ PTI ممبر شناخت۔',
      },
      {
        src: '/home-slides/pti-slide-02.jpg',
        title: 'رضاکار رابطہ',
        text: 'جغرافیہ، مہارت اور دستیابی کے مطابق رضاکاروں کو منظم کریں۔',
      },
      {
        src: '/home-slides/pti-slide-03.jpg',
        title: 'فیلڈ آپریشنز',
        text: 'مہمات، اجتماعات اور سرگرمیوں کے لیے ٹیمیں، شفٹس اور ذمہ داریاں بنائیں۔',
      },
      {
        src: '/home-slides/pti-slide-04.jpg',
        title: 'شرکت کی نگرانی',
        text: 'چیک اِن، حاضری اور مکمل ذمہ داریوں کو واضح آڈٹ ٹریل کے ساتھ ٹریک کریں۔',
      },
    ],
  },
}

const moduleIcons: ReactNode[] = [
  <IdCard className="h-5 w-5" />,
  <UsersRound className="h-5 w-5" />,
  <ClipboardList className="h-5 w-5" />,
  <CalendarCheck2 className="h-5 w-5" />,
]

function HomePage() {
  const { isLoggedIn } = useAuthRole()
  const { language, direction } = useI18n()
  const copy = HOME_COPY[language === 'ur' ? 'ur' : 'en']
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % copy.slides.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [copy.slides.length])

  const slide = copy.slides[slideIndex]
  const isRtl = direction === 'rtl'
  const moduleCards = useMemo(() => copy.modules.map((item, index) => ({ ...item, icon: moduleIcons[index] })), [copy.modules])

  return (
    <main dir={direction} className="px-3 py-6 sm:px-4 lg:py-10">
      <div className="page-wrap space-y-6 lg:space-y-8">
        <section className="pti-panel overflow-hidden rounded-[2rem] lg:rounded-[2.5rem]">
          <div className="grid min-h-[38rem] lg:grid-cols-[1.03fr_.97fr]">
            <div className="relative flex flex-col justify-center p-6 sm:p-9 lg:p-12 xl:p-14">
              <div className="absolute left-0 top-0 h-1.5 w-full bg-[linear-gradient(90deg,#0b5d36_0_48%,#ffffff_48%_52%,#c5242b_52%_100%)]" />

              <div className="mb-7 flex items-center gap-3">
                <img src={PTI_LOGO_PATH} alt="PTI" className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
                <div>
                  <p className="pti-eyebrow">{copy.eyebrow}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">Digital Operations Platform</p>
                </div>
              </div>

              <h1 className="max-w-[15ch] text-[clamp(2.8rem,6.4vw,5.7rem)] font-black leading-[.95] tracking-[-.055em] text-slate-950">
                {copy.title}{' '}
                <span className="pti-gradient-text">{copy.highlight}</span>
              </h1>

              <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
                {copy.lede}
              </p>

              <div className={`mt-8 flex flex-wrap gap-3 ${isRtl ? 'justify-end' : ''}`}>
                <Link
                  to={isLoggedIn ? '/dashboard' : '/signup'}
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_15px_35px_rgba(15,23,42,.18)] transition hover:-translate-y-0.5 hover:bg-emerald-950"
                >
                  {isLoggedIn ? copy.secondary : copy.primary}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                </Link>
                {!isLoggedIn ? (
                  <Link
                    to="/login"
                    className="inline-flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    {copy.secondary}
                  </Link>
                ) : (
                  <Link
                    to="/volunteer"
                    className="inline-flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    Volunteer
                  </Link>
                )}
              </div>

              <div className="mt-9 grid gap-2 sm:grid-cols-3">
                {copy.proof.map((item, index) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-3 text-xs font-extrabold text-slate-700">
                    {index === 0 ? <BadgeCheck className="h-4 w-4 text-emerald-700" /> : index === 1 ? <ShieldCheck className="h-4 w-4 text-emerald-700" /> : <Layers3 className="h-4 w-4 text-emerald-700" />}
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[31rem] overflow-hidden bg-slate-950 lg:min-h-full">
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-700"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,20,13,.05),rgba(3,12,9,.45)_48%,rgba(2,8,6,.94)_100%)]" />
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/25 bg-white/90 px-3 py-2 text-xs font-black text-emerald-900 shadow-lg backdrop-blur sm:left-8 sm:top-8">
                <QrCode className="h-4 w-4" />
                PTI Digital Platform
              </div>

              <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9 lg:p-10">
                <p className="text-xs font-black uppercase tracking-[.22em] text-emerald-200">PTI Workflow</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{slide.title}</h2>
                <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-200 sm:text-base">{slide.text}</p>

                <div className="mt-6 flex items-center gap-2">
                  {copy.slides.map((item, index) => (
                    <button
                      key={item.src}
                      type="button"
                      onClick={() => setSlideIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${index === slideIndex ? 'w-10 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'}`}
                      aria-label={`Show slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_55px_rgba(15,23,42,.06)] backdrop-blur-xl sm:p-7 lg:p-9">
          <div className="max-w-3xl">
            <p className="pti-eyebrow">{copy.modulesKicker}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">{copy.modulesTitle}</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-600 sm:text-base">{copy.modulesText}</p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {moduleCards.map((item, index) => (
              <article key={item.title} className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${index === 0 ? 'bg-emerald-50 text-emerald-800' : index === 1 ? 'bg-red-50 text-red-700' : index === 2 ? 'bg-slate-100 text-slate-800' : 'bg-amber-50 text-amber-800'}`}>
                  {item.icon}
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{item.text}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                  Active module <ChevronRight className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-emerald-950 text-white shadow-[0_22px_60px_rgba(7,61,37,.2)]">
          <div className="grid lg:grid-cols-[.86fr_1.14fr]">
            <div className="p-7 sm:p-9 lg:p-11">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-100 ring-1 ring-white/15">
                <Globe2 className="h-6 w-6" />
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[.22em] text-emerald-200">{copy.nationwideKicker}</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.035em] sm:text-4xl">{copy.nationwideTitle}</h2>
              <p className="mt-4 max-w-xl text-sm font-semibold leading-7 text-emerald-50/80 sm:text-base">{copy.nationwideText}</p>
            </div>

            <div className="border-t border-white/10 bg-white/[.04] p-7 sm:p-9 lg:border-l lg:border-t-0 lg:p-11">
              <div className="space-y-3">
                {copy.scope.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-emerald-100">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flex-1 text-sm font-black sm:text-base">{item}</span>
                    {index === 0 ? <ShieldCheck className="h-4 w-4 text-emerald-200" /> : <MapPinned className="h-4 w-4 text-emerald-200" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
