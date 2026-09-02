import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Menu, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getAccountItems,
  loggedOutAccountItems,
  memberNavigationItems,
  publicNavigationItems,
  type HeaderMenuKey,
} from '../../config/navigation'
import { useAuthRole } from '../../hooks/useAuthRole'
import { LanguageSwitcher } from '../../lib/i18n'
import { BBJF_ICON_PATH } from '../MembershipCard'
import { AccountMenuButton, AccountMenuPanel } from './AccountMenu'
import { NavLink } from './NavLink'

export function Header({ compact }: { compact: boolean }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const headerRef = useRef<HTMLElement | null>(null)
  const [openMenu, setOpenMenu] = useState<HeaderMenuKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const {
    authLoading,
    logoutLoading,
    isLoggedIn,
    isAdmin,
    accountInitial,
    logout,
  } = useAuthRole()

  const accountOpen = openMenu === 'account'
  const accountItems = useMemo(
    () => (isLoggedIn ? getAccountItems(isAdmin) : loggedOutAccountItems),
    [isAdmin, isLoggedIn],
  )

  useEffect(() => {
    setOpenMenu(null)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!openMenu) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target
      if (target instanceof Node && headerRef.current?.contains(target)) return
      setOpenMenu(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  useEffect(() => {
    if (!mobileOpen) return

    const scrollY = window.scrollY
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousWidth = document.body.style.width

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.width = previousWidth
      window.scrollTo(0, scrollY)
    }
  }, [mobileOpen])

  async function handleLogout() {
    const ok = await logout()
    if (ok) {
      setOpenMenu(null)
      setMobileOpen(false)
      navigate({ to: '/' })
    }
  }

  const desktopMemberItems = isLoggedIn ? memberNavigationItems : []

  return (
    <header
      ref={headerRef}
      className={`site-header sticky top-0 z-40 border-b border-white/70 bg-[#f8f4ee]/90 backdrop-blur-xl ${
        compact ? 'shadow-sm' : ''
      }`}
    >
      <div className="page-wrap flex min-h-[4.75rem] items-center justify-between gap-3 py-3">
        <Link to="/" className="group flex min-w-0 items-center gap-3 no-underline">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 p-1.5 shadow-lg ring-1 ring-black/5">
            <img
              src={BBJF_ICON_PATH}
              alt="BBJF logo"
              className="h-full w-full rounded-xl object-cover"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-white">
              <ShieldCheck className="h-3 w-3" />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-black leading-5 text-slate-950 sm:text-base">
              Bilawal Bhutto Jayala Federation
            </span>
            <span className="block text-xs font-extrabold uppercase tracking-[0.22em] text-emerald-700">
              BBJF Membership Portal
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/75 bg-white/70 p-1 shadow-sm lg:flex">
          {publicNavigationItems.map((item) => (
            <NavLink key={item.label} to={item.to ?? '/'} compact={compact}>
              {item.label}
            </NavLink>
          ))}
          {desktopMemberItems.map((item) => (
            <NavLink key={item.label} to={item.to ?? '/dashboard'} compact={compact}>
              {item.label}
            </NavLink>
          ))}
          {isLoggedIn && isAdmin ? (
            <NavLink to="/admin" compact={compact}>
              Admin
            </NavLink>
          ) : null}
          {!authLoading && !isLoggedIn ? (
            <>
              <NavLink to="/signup" compact={compact}>
                Join Now
              </NavLink>
              <NavLink to="/login" compact={compact}>
                Login
              </NavLink>
            </>
          ) : null}
        </nav>

        <div className="relative flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher compact={compact} />
          </div>

          <div className="hidden lg:block">
            <AccountMenuButton
              accountInitial={isLoggedIn ? accountInitial : 'BB'}
              isOpen={accountOpen}
              onClick={() => setOpenMenu(accountOpen ? null : 'account')}
            />
            {accountOpen ? (
              <AccountMenuPanel
                items={accountItems}
                logoutLoading={logoutLoading}
                onItemClick={() => setOpenMenu(null)}
                onLogout={() => void handleLogout()}
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          />
          <div className="absolute right-0 top-0 flex h-dvh w-[min(24rem,92vw)] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                  BBJF
                </p>
                <h2 className="truncate text-lg font-black text-slate-950">
                  Membership Menu
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-800"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 sm:hidden">
                <LanguageSwitcher compact />
              </div>

              <div className="grid gap-2">
                {(isLoggedIn ? accountItems : loggedOutAccountItems).map((item) => {
                  if (item.action === 'logout') {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void handleLogout()}
                        disabled={logoutLoading}
                        className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-left font-bold text-red-700 disabled:opacity-60"
                      >
                        <span>{item.icon}</span>
                        <span>{logoutLoading ? 'Logging out...' : item.label}</span>
                      </button>
                    )
                  }

                  if (!item.to) return null

                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 no-underline"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                        {item.icon}
                      </span>
                      <span>
                        <span className="block text-sm font-black text-slate-950">
                          {item.label}
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
