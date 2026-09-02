import { Download, MonitorDown, Smartphone, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  readonly platforms?: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const DISMISS_KEY = 'bbjf-pwa-install-dismissed-at'
const DISMISS_DAYS = 7

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    navigatorWithStandalone.standalone === true
  )
}

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false

  const ua = window.navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua)
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua)

  return isIos && isSafari
}

function wasRecentlyDismissed(): boolean {
  if (typeof window === 'undefined') return true

  const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || '0')
  if (!dismissedAt) return false

  const elapsed = Date.now() - dismissedAt
  return elapsed < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

async function registerServiceWorker() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (!import.meta.env.PROD) return

  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (error) {
    console.warn('[BBJF PWA] Service worker registration failed:', error)
  }
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [isIosHint, setIsIosHint] = useState(false)

  useEffect(() => {
    void registerServiceWorker()

    if (typeof window === 'undefined') return
    if (isStandaloneDisplay() || wasRecentlyDismissed()) return

    const beforeInstallPromptHandler = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      window.setTimeout(() => setShowPrompt(true), 1200)
    }

    const appInstalledHandler = () => {
      setShowPrompt(false)
      setInstallEvent(null)
      window.localStorage.removeItem(DISMISS_KEY)
    }

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler)
    window.addEventListener('appinstalled', appInstalledHandler)

    if (isIosSafari()) {
      setIsIosHint(true)
      window.setTimeout(() => setShowPrompt(true), 1600)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler)
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
  }, [])

  const canInstall = Boolean(installEvent) || isIosHint

  const helperText = useMemo(() => {
    if (isIosHint) {
      return 'Open Share menu, then choose Add to Home Screen for faster BBJF access.'
    }

    return 'Install the BBJF member portal for faster access to registration, dashboard, digital cards, and admin tools.'
  }, [isIosHint])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    setShowPrompt(false)
  }

  const handleInstall = async () => {
    if (isIosHint) {
      return
    }

    if (!installEvent) return

    setIsInstalling(true)
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        setShowPrompt(false)
        setInstallEvent(null)
      } else {
        handleDismiss()
      }
    } finally {
      setIsInstalling(false)
    }
  }

  if (!canInstall || !showPrompt) return null

  return (
    <aside
      aria-label="Install BBJF app"
      className="fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-[28rem] rounded-[1.45rem] border border-emerald-100 bg-white/95 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-md sm:p-5"
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex gap-3 pr-7">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-white shadow-[0_14px_30px_rgba(6,78,59,0.22)]">
          {isIosHint ? (
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Download className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-emerald-800">
            Install BBJF App
          </p>
          <h2 className="mt-1 text-lg font-black leading-tight text-slate-950">
            Install BBJF App
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {helperText}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {isIosHint ? (
          <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-900">
            <MonitorDown className="h-4 w-4" aria-hidden="true" />
            Add to Home Screen
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstall}
            disabled={isInstalling}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(6,95,70,0.2)] transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isInstalling ? 'Opening...' : 'Install BBJF App'}
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Not now
        </button>
      </div>
    </aside>
  )
}
