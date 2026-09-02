import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BadgeCheck, ClipboardCheck, IdCard, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { BBJF_ICON_PATH } from '../components/MembershipCard'
import { useAuthRole } from '../hooks/useAuthRole'
import { useI18n, type AppLanguage } from '../lib/i18n'

export const Route = createFileRoute('/')({
  component: HomePage,
})

type HomeSlide = {
  src: string
  alt: string
  title: string
  text: string
}

type HomeCopy = {
  kicker: string
  titleLines: [string, string, string]
  lede: string
  ctaDashboard: string
  ctaSignup: string
  ctaCard: string
  ctaLogin: string
  ctaAdmin: string
  steps: Array<{ label: string; value: string }>
  badges: {
    secureReview: string
    qrVerified: string
  }
  slides: HomeSlide[]
  workflow: string
  slideButtonLabel: string
  features: Array<{ title: string; text: string }>
  scopeKicker: string
  scopeTitle: string
  scopeText: string
  scopeItems: string[]
}

const HOME_COPY: Record<AppLanguage, HomeCopy> = {
  en: {
    kicker: 'BBJF Membership Portal',
    titleLines: ['Digital', 'Membership', 'System'],
    lede:
      'A focused membership portal for BBJF: signup, membership form, admin approval, digital card, QR verification and member dashboard.',
    ctaDashboard: 'Open Dashboard',
    ctaSignup: 'Become a Member',
    ctaCard: 'Digital Card',
    ctaLogin: 'Login',
    ctaAdmin: 'Admin Panel',
    steps: [
      { label: 'Step 01', value: 'Signup' },
      { label: 'Step 02', value: 'Admin Review' },
      { label: 'Step 03', value: 'QR Card' },
    ],
    badges: {
      secureReview: 'Secure Review',
      qrVerified: 'QR Verified',
    },
    slides: [
      {
        src: '/home-slides/bbjf-slide-01.jpg',
        alt: 'BBJF leadership portrait for digital membership platform',
        title: 'Digital Membership',
        text: 'A verified member record, secure profile and QR-enabled digital card.',
      },
      {
        src: '/home-slides/bbjf-slide-02.jpg',
        alt: 'BBJF public gathering and outreach moment',
        title: 'Member Registration',
        text: 'Members submit complete details once and track the review status online.',
      },
      {
        src: '/home-slides/bbjf-slide-03.jpg',
        alt: 'BBJF leadership speaking at a formal event',
        title: 'Admin Approval',
        text: 'Admin officers review applications before member number and card activation.',
      },
      {
        src: '/home-slides/bbjf-slide-04.jpg',
        alt: 'BBJF public address and member engagement',
        title: 'QR Verification',
        text: 'Approved members receive a public verification link and downloadable card.',
      },
    ],
    workflow: 'BBJF Workflow',
    slideButtonLabel: 'Show home slide',
    features: [
      {
        title: 'Membership Form',
        text: 'Collects member identity, area and contact details in a clean mobile-first flow. Official designations are assigned by admin after approval.',
      },
      {
        title: 'Admin Console',
        text: 'Admins can search, filter, approve, reject and export member applications without extra modules.',
      },
      {
        title: 'Digital Card',
        text: 'Approved members get front/back digital card, QR code, verification page and PNG download.',
      },
    ],
    scopeKicker: 'Membership portal only',
    scopeTitle:
      'Clean BBJF scope with Rs. 500 membership fee receipt verification, digital cards and admin workflows.',
    scopeText:
      'This app is intentionally focused on membership lifecycle: account, registration, review, approval, card and public QR verification.',
    scopeItems: [
      'Mobile-first member dashboard',
      'Admin approval workflow',
      'Searchable member records',
      'QR public verification',
      'Front/back card export',
      'English / Urdu / Sindhi support',
    ],
  },
  ur: {
    kicker: 'بی بی جے ایف ممبرشپ پورٹل',
    titleLines: ['ڈیجیٹل', 'ممبرشپ', 'سسٹم'],
    lede:
      'BBJF کے لیے ایک مکمل ممبرشپ پورٹل: سائن اَپ، ممبرشپ فارم، ایڈمن منظوری، ڈیجیٹل کارڈ، QR ویریفکیشن اور ممبر ڈیش بورڈ۔',
    ctaDashboard: 'ڈیش بورڈ کھولیں',
    ctaSignup: 'ممبر بنیں',
    ctaCard: 'ڈیجیٹل کارڈ',
    ctaLogin: 'لاگ اِن',
    ctaAdmin: 'ایڈمن پینل',
    steps: [
      { label: 'مرحلہ 01', value: 'سائن اَپ' },
      { label: 'مرحلہ 02', value: 'ایڈمن ریویو' },
      { label: 'مرحلہ 03', value: 'QR کارڈ' },
    ],
    badges: {
      secureReview: 'محفوظ ریویو',
      qrVerified: 'QR تصدیق شدہ',
    },
    slides: [
      {
        src: '/home-slides/bbjf-slide-01.jpg',
        alt: 'ڈیجیٹل ممبرشپ پلیٹ فارم کے لیے BBJF قیادت کی تصویر',
        title: 'ڈیجیٹل ممبرشپ',
        text: 'تصدیق شدہ ممبر ریکارڈ، محفوظ پروفائل اور QR سے منسلک ڈیجیٹل کارڈ۔',
      },
      {
        src: '/home-slides/bbjf-slide-02.jpg',
        alt: 'BBJF عوامی اجتماع اور رابطہ مہم',
        title: 'ممبر رجسٹریشن',
        text: 'ممبرز اپنی مکمل معلومات ایک بار جمع کراتے ہیں اور ریویو اسٹیٹس آن لائن دیکھتے ہیں۔',
      },
      {
        src: '/home-slides/bbjf-slide-03.jpg',
        alt: 'BBJF قیادت رسمی تقریب میں خطاب کرتے ہوئے',
        title: 'ایڈمن منظوری',
        text: 'ایڈمن افسران ممبر نمبر اور کارڈ ایکٹیویشن سے پہلے درخواستوں کا جائزہ لیتے ہیں۔',
      },
      {
        src: '/home-slides/bbjf-slide-04.jpg',
        alt: 'BBJF عوامی خطاب اور ممبر رابطہ',
        title: 'QR ویریفکیشن',
        text: 'منظور شدہ ممبرز کو پبلک ویریفکیشن لنک اور ڈاؤن لوڈ ایبل کارڈ ملتا ہے۔',
      },
    ],
    workflow: 'BBJF ورک فلو',
    slideButtonLabel: 'ہوم سلائیڈ دکھائیں',
    features: [
      {
        title: 'ممبرشپ فارم',
        text: 'ممبر کی شناخت، علاقہ اور رابطہ معلومات کو صاف موبائل فرسٹ فلو میں جمع کرتا ہے۔ سرکاری عہدے منظوری کے بعد ایڈمن تفویض کرتا ہے۔',
      },
      {
        title: 'ایڈمن کنسول',
        text: 'ایڈمنز اضافی ماڈیولز کے بغیر درخواستیں تلاش، فلٹر، منظور، مسترد اور ایکسپورٹ کر سکتے ہیں۔',
      },
      {
        title: 'ڈیجیٹل کارڈ',
        text: 'منظور شدہ ممبرز کو فرنٹ/بیک ڈیجیٹل کارڈ، QR کوڈ، ویریفکیشن پیج اور PNG ڈاؤن لوڈ ملتا ہے۔',
      },
    ],
    scopeKicker: 'صرف ممبرشپ پورٹل',
    scopeTitle:
      'Rs. 500 ممبرشپ فیس رسید ویریفکیشن، ڈیجیٹل کارڈز اور ایڈمن ورک فلو کے ساتھ صاف BBJF اسکوپ۔',
    scopeText:
      'یہ ایپ ممبرشپ لائف سائیکل پر فوکس کرتی ہے: اکاؤنٹ، رجسٹریشن، ریویو، منظوری، کارڈ اور پبلک QR ویریفکیشن۔',
    scopeItems: [
      'موبائل فرسٹ ممبر ڈیش بورڈ',
      'ایڈمن منظوری ورک فلو',
      'قابل تلاش ممبر ریکارڈز',
      'QR پبلک ویریفکیشن',
      'فرنٹ/بیک کارڈ ایکسپورٹ',
      'English / Urdu / Sindhi سپورٹ',
    ],
  },
  sd: {
    kicker: 'بي بي جي ايف ميمبرشپ پورٽل',
    titleLines: ['ڊجيٽل', 'ميمبرشپ', 'سسٽم'],
    lede:
      'BBJF لاءِ مڪمل ميمبرشپ پورٽل: سائن اَپ، ميمبرشپ فارم، ايڊمن منظوري، ڊجيٽل ڪارڊ، QR ويريفڪيشن ۽ ميمبر ڊيش بورڊ.',
    ctaDashboard: 'ڊيش بورڊ کوليو',
    ctaSignup: 'ميمبر بڻجو',
    ctaCard: 'ڊجيٽل ڪارڊ',
    ctaLogin: 'لاگ اِن',
    ctaAdmin: 'ايڊمن پينل',
    steps: [
      { label: 'مرحلو 01', value: 'سائن اَپ' },
      { label: 'مرحلو 02', value: 'ايڊمن ريويو' },
      { label: 'مرحلو 03', value: 'QR ڪارڊ' },
    ],
    badges: {
      secureReview: 'محفوظ ريويو',
      qrVerified: 'QR تصديق ٿيل',
    },
    slides: [
      {
        src: '/home-slides/bbjf-slide-01.jpg',
        alt: 'ڊجيٽل ميمبرشپ پليٽ فارم لاءِ BBJF قيادت جي تصوير',
        title: 'ڊجيٽل ميمبرشپ',
        text: 'تصديق ٿيل ميمبر رڪارڊ، محفوظ پروفائل ۽ QR سان ڳنڍيل ڊجيٽل ڪارڊ.',
      },
      {
        src: '/home-slides/bbjf-slide-02.jpg',
        alt: 'BBJF عوامي گڏجاڻي ۽ رابطا مهم',
        title: 'ميمبر رجسٽريشن',
        text: 'ميمبر مڪمل معلومات هڪ ڀيرو جمع ڪرائين ٿا ۽ ريويو اسٽيٽس آن لائن ڏسن ٿا.',
      },
      {
        src: '/home-slides/bbjf-slide-03.jpg',
        alt: 'BBJF قيادت رسمي تقريب ۾ خطاب ڪندي',
        title: 'ايڊمن منظوري',
        text: 'ايڊمن آفيسر ميمبر نمبر ۽ ڪارڊ ايڪٽيويشن کان اڳ درخواستن جو جائزو وٺن ٿا.',
      },
      {
        src: '/home-slides/bbjf-slide-04.jpg',
        alt: 'BBJF عوامي خطاب ۽ ميمبر رابطي',
        title: 'QR ويريفڪيشن',
        text: 'منظور ٿيل ميمبرن کي پبلڪ ويريفڪيشن لنڪ ۽ ڊائون لوڊ ٿيندڙ ڪارڊ ملي ٿو.',
      },
    ],
    workflow: 'BBJF ورڪ فلو',
    slideButtonLabel: 'هوم سلائيڊ ڏيکاريو',
    features: [
      {
        title: 'ميمبرشپ فارم',
        text: 'ميمبر جي سڃاڻپ، علائقو ۽ رابطي جي معلومات صاف موبائل فرسٽ فلو ۾ جمع ڪري ٿو. سرڪاري عهدا منظوري کان پوءِ ايڊمن تفويض ڪري ٿو.',
      },
      {
        title: 'ايڊمن ڪنسول',
        text: 'ايڊمنز اضافي ماڊيولز کانسواءِ درخواستون ڳولي، فلٽر، منظور، رد ۽ ايڪسپورٽ ڪري سگهن ٿا.',
      },
      {
        title: 'ڊجيٽل ڪارڊ',
        text: 'منظور ٿيل ميمبرن کي فرنٽ/بئڪ ڊجيٽل ڪارڊ، QR ڪوڊ، ويريفڪيشن پيج ۽ PNG ڊائون لوڊ ملي ٿو.',
      },
    ],
    scopeKicker: 'صرف ميمبرشپ پورٽل',
    scopeTitle:
      'Rs. 500 ميمبرشپ فيس رسيد ويريفڪيشن، ڊجيٽل ڪارڊز ۽ ايڊمن ورڪ فلو سان صاف BBJF اسڪوپ.',
    scopeText:
      'هي ايپ ميمبرشپ لائيف سائيڪل تي فوڪس ڪري ٿي: اڪائونٽ، رجسٽريشن، ريويو، منظوري، ڪارڊ ۽ پبلڪ QR ويريفڪيشن.',
    scopeItems: [
      'موبائل فرسٽ ميمبر ڊيش بورڊ',
      'ايڊمن منظوري ورڪ فلو',
      'ڳولڻ لائق ميمبر رڪارڊز',
      'QR پبلڪ ويريفڪيشن',
      'فرنٽ/بئڪ ڪارڊ ايڪسپورٽ',
      'English / Urdu / Sindhi سپورٽ',
    ],
  },
}

function HomePage() {
  const { isLoggedIn, isAdmin } = useAuthRole()
  const { language, direction } = useI18n()
  const copy = HOME_COPY[language]
  const isRtl = direction === 'rtl'

  return (
    <main dir={direction} className="bbjf-home-page px-3 py-6 sm:px-4 md:py-12">
      <div className="page-wrap bbjf-home-wrap space-y-7 md:space-y-8">
        <section className="bbjf-home-hero relative isolate overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-5 md:rounded-[2.5rem] md:p-8 lg:p-10">
          <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-500/12 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-slate-950 to-emerald-700" />

          <div className="relative z-10 grid min-w-0 items-center gap-7 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
            <div className={`min-w-0 max-w-3xl text-start ${isRtl ? 'lg:order-1' : ''}`}>
              <div className="bbjf-home-kicker inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800 sm:gap-3 sm:px-4 sm:text-xs sm:tracking-[0.22em]">
                <img src={BBJF_ICON_PATH} alt="" className="h-6 w-6 rounded-full object-cover" />
                <span>{copy.kicker}</span>
              </div>

              <h1
                className={`bbjf-home-title mt-5 max-w-none text-[clamp(2.85rem,8.2vw,5.15rem)] font-black leading-[0.94] text-slate-950 sm:mt-6 md:text-[4.95rem] lg:text-[5.2rem] xl:text-[5.55rem] ${
                  isRtl ? 'tracking-normal' : 'tracking-[-0.055em]'
                }`}
              >
                <span className="block whitespace-nowrap">{copy.titleLines[0]}</span>
                <span className="block whitespace-nowrap text-emerald-700">{copy.titleLines[1]}</span>
                <span className="block whitespace-nowrap">{copy.titleLines[2]}</span>
              </h1>

              <p className="bbjf-home-lede mt-5 max-w-2xl text-[0.98rem] font-semibold leading-7 text-slate-600 sm:text-lg sm:leading-8 md:text-xl">
                {copy.lede}
              </p>

              <div className="bbjf-home-actions mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  to={isLoggedIn ? '/dashboard' : '/signup'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/15 no-underline transition hover:-translate-y-0.5 hover:bg-black sm:w-auto sm:px-6"
                >
                  {isLoggedIn ? copy.ctaDashboard : copy.ctaSignup}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
                </Link>

                <Link
                  to={isLoggedIn ? '/card' : '/login'}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm no-underline transition hover:-translate-y-0.5 hover:bg-slate-50 sm:w-auto sm:px-6"
                >
                  {isLoggedIn ? copy.ctaCard : copy.ctaLogin}
                </Link>

                {isLoggedIn && isAdmin ? (
                  <Link
                    to="/admin"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 shadow-sm no-underline transition hover:-translate-y-0.5 hover:bg-emerald-100 sm:w-auto sm:px-6"
                  >
                    {copy.ctaAdmin}
                  </Link>
                ) : null}
              </div>

              <div className="bbjf-home-steps mt-7 grid gap-3 sm:mt-8 sm:grid-cols-3">
                <MiniMetric icon={<UsersRound className="h-5 w-5" />} label={copy.steps[0].label} value={copy.steps[0].value} />
                <MiniMetric icon={<ClipboardCheck className="h-5 w-5" />} label={copy.steps[1].label} value={copy.steps[1].value} />
                <MiniMetric icon={<IdCard className="h-5 w-5" />} label={copy.steps[2].label} value={copy.steps[2].value} />
              </div>
            </div>

            <div className={`relative min-w-0 ${isRtl ? 'lg:order-2' : ''}`}>
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-red-500/12 via-white/0 to-emerald-500/14 blur-2xl" />
              <HomePhotoSlider copy={copy} />
              <FloatingBadge className="left-4 top-4" icon={<ShieldCheck className="h-4 w-4" />} label={copy.badges.secureReview} />
              <FloatingBadge className="bottom-4 right-4" icon={<BadgeCheck className="h-4 w-4" />} label={copy.badges.qrVerified} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<ClipboardCheck className="h-6 w-6" />}
            title={copy.features[0].title}
            text={copy.features[0].text}
          />
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title={copy.features[1].title}
            text={copy.features[1].text}
          />
          <FeatureCard
            icon={<IdCard className="h-6 w-6" />}
            title={copy.features[2].title}
            text={copy.features[2].text}
          />
        </section>

        <section className="grid gap-5 rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.14)] md:grid-cols-[0.95fr_1.05fr] md:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
              {copy.scopeKicker}
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              {copy.scopeTitle}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/70">
              {copy.scopeText}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {copy.scopeItems.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-white/85">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function HomePhotoSlider({ copy }: { copy: HomeCopy }) {
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % copy.slides.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [copy.slides.length])

  const slide = copy.slides[activeSlide]

  return (
    <div className="bbjf-photo-slider relative overflow-hidden rounded-[1.7rem] border border-white/60 bg-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.30)] md:rounded-[2.2rem]">
      <div className="relative aspect-[4/3] min-h-[280px] sm:min-h-[430px] lg:min-h-[560px]">
        {copy.slides.map((item, index) => (
          <img
            key={item.src}
            src={item.src}
            alt={item.alt}
            className={`absolute inset-0 h-full w-full object-cover transition duration-700 ease-out ${
              index === activeSlide ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
            }`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-white to-emerald-700" />

        <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-7">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">
            {copy.workflow}
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight md:text-5xl">
            {slide.title}
          </h2>
          <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/85 md:text-base">
            {slide.text}
          </p>

          <div className="mt-5 flex items-center gap-2">
            {copy.slides.map((item, index) => (
              <button
                key={item.src}
                type="button"
                aria-label={`${copy.slideButtonLabel} ${index + 1}`}
                aria-pressed={index === activeSlide}
                onClick={() => setActiveSlide(index)}
                className={`h-3 rounded-full transition-all ${
                  index === activeSlide ? 'w-12 bg-white' : 'w-3 bg-white/45 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          {icon}
        </span>
        <span>
          <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            {label}
          </span>
          <strong className="mt-0.5 block text-sm font-black text-slate-950">
            {value}
          </strong>
        </span>
      </div>
    </div>
  )
}

function FloatingBadge({
  className,
  icon,
  label,
}: {
  className: string
  icon: ReactNode
  label: string
}) {
  return (
    <div className={`absolute z-10 hidden items-center gap-2 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs font-black text-slate-900 shadow-xl backdrop-blur md:flex ${className}`}>
      <span className="text-emerald-700">{icon}</span>
      {label}
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode
  title: string
  text: string
}) {
  return (
    <article className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,0.12)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
        {icon}
      </span>
      <h2 className="mt-5 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{text}</p>
    </article>
  )
}
