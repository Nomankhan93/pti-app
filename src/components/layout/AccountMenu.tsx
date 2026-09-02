import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { NavigationItem } from '../../config/navigation'

export function AccountMenuButton({
  accountInitial,
  isOpen,
  unreadLabel,
  onClick,
}: {
  accountInitial: string
  isOpen: boolean
  unreadLabel?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-black shadow-sm transition ${
        isOpen
          ? 'border-slate-950 bg-slate-950 text-white'
          : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-200 hover:bg-emerald-50'
      }`}
      aria-label="Open account menu"
      aria-expanded={isOpen}
    >
      {accountInitial}
      {unreadLabel ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white ring-2 ring-white">
          {unreadLabel}
        </span>
      ) : null}
    </button>
  )
}

export function AccountMenuPanel({
  items,
  logoutLoading,
  onItemClick,
  onLogout,
}: {
  items: NavigationItem[]
  logoutLoading: boolean
  onItemClick: () => void
  onLogout: () => void
}) {
  return (
    <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 text-left shadow-2xl">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
          BBJF Member Access
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Membership portal shortcuts
        </p>
      </div>

      <div className="py-2">
        {items.map((item) => {
          const content = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-black text-slate-950">
                  {item.label}
                  {item.badge ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                      {item.badge}
                    </span>
                  ) : null}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500">
                    {item.description}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </>
          )

          if (item.action === 'logout') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={onLogout}
                disabled={logoutLoading}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {content}
              </button>
            )
          }

          if (!item.to) return null

          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={onItemClick}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 no-underline transition hover:bg-slate-50"
            >
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
