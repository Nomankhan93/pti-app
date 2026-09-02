import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect, type ReactNode } from 'react'
import { Header } from '../components/layout/Header'
import { NotFoundPage } from '../components/layout/NotFoundPage'
import { PwaBootstrap } from '../components/layout/PwaBootstrap'
import { I18nProvider, useI18n } from '../lib/i18n'
import styles from '../styles.css?url'

const APP_NAME = 'Bilawal Bhutto Jayala Federation'
const APP_SHORT_NAME = 'BBJF'
const APP_FULL_TITLE = `${APP_NAME} | Digital Membership Portal`
const BBJF_ICON_PATH = '/bbjf-icon-512.png'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: APP_FULL_TITLE },
      {
        name: 'description',
        content:
          'Bilawal Bhutto Jayala Federation digital membership portal for signup, member registration, admin approval, digital cards and QR verification.',
      },
      { name: 'theme-color', content: '#0f172a' },
      { name: 'application-name', content: APP_SHORT_NAME },
      { name: 'apple-mobile-web-app-title', content: APP_SHORT_NAME },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'msapplication-TileColor', content: '#0f172a' },
      { name: 'format-detection', content: 'telephone=no' },
      { property: 'og:title', content: APP_FULL_TITLE },
      {
        property: 'og:description',
        content:
          'Register, manage and verify BBJF digital membership with QR-enabled cards.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: BBJF_ICON_PATH },
    ],
    links: [
      { rel: 'stylesheet', href: styles },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Manrope:wght@500;600;700;800;900&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  const isPublicVerifyPage = pathname.startsWith('/verify/')
  const isCardPreviewPage =
    pathname === '/card' ||
    pathname.includes('/admin/members/') ||
    pathname.endsWith('/card')

  return (
    <RootDocument>
      <I18nProvider>
        <I18nShell>
          <div className="min-h-screen bg-[linear-gradient(180deg,#fbf9f4_0%,#f6f2e9_55%,#f8f5ef_100%)] text-slate-950">
            <div
              className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.10),transparent_40%),radial-gradient(circle_at_top_right,rgba(5,150,105,0.12),transparent_35%)]"
              aria-hidden="true"
            />

            <PwaBootstrap />
            {!isPublicVerifyPage ? <Header compact={isCardPreviewPage} /> : null}

            <div className="relative z-10">
              <Outlet />
            </div>

            {!isPublicVerifyPage ? <SiteFooter /> : null}
          </div>
        </I18nShell>
      </I18nProvider>

      {import.meta.env.DEV ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-emerald-900 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <div id="main-content">{children}</div>
        <Scripts />
      </body>
    </html>
  )
}

function I18nShell({ children }: { children: ReactNode }) {
  const { language, direction } = useI18n()

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = direction
    document.body.dataset.language = language
    document.body.dataset.direction = direction
  }, [direction, language])

  return <div dir={direction}>{children}</div>
}

function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="relative z-10 border-t border-white/70 bg-white/55 py-8 backdrop-blur-xl">
      <div className="page-wrap flex flex-col gap-2 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {t('brand.name')}. All rights reserved.</p>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
          Digital Membership Portal
        </p>
      </div>
    </footer>
  )
}
