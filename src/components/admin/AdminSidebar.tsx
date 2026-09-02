import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight, LockKeyhole } from 'lucide-react'
import {
  adminNavigationGroups,
  type AdminNavigationItem,
} from '../../config/admin-navigation'

function normalizePath(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

function isActivePath(currentPath: string, itemTo?: string) {
  if (!itemTo) return false

  const current = normalizePath(currentPath)
  const target = normalizePath(itemTo)

  if (target === '/admin') {
    return current === '/admin' || current.startsWith('/admin/members')
  }

  return current === target || current.startsWith(`${target}/`)
}

export function AdminSidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean
  onNavigate?: () => void
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <aside
      className={mobile ? 'admin-sidebar admin-sidebar-mobile' : 'admin-sidebar'}
      aria-label="Admin navigation"
    >
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-brand-icon">BBJF</span>
        <span>
          <strong>Admin Panel</strong>
          <small>Membership Console</small>
        </span>
      </div>

      <nav className="admin-sidebar-nav">
        {adminNavigationGroups.map((group) => (
          <section key={group.title} className="admin-sidebar-group">
            <p className="admin-sidebar-group-title">{group.title}</p>

            <div className="admin-sidebar-group-items">
              {group.items.map((item) => (
                <AdminSidebarItem
                  key={`${group.title}-${item.label}`}
                  item={item}
                  active={isActivePath(pathname, item.to)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  )
}

function AdminSidebarItem({
  item,
  active,
  onNavigate,
}: {
  item: AdminNavigationItem
  active: boolean
  onNavigate?: () => void
}) {
  const content = (
    <>
      <span className="admin-sidebar-item-icon">{item.icon}</span>
      <span className="admin-sidebar-item-copy">
        <span className="admin-sidebar-item-label">{item.label}</span>
        {item.description ? (
          <span className="admin-sidebar-item-desc">{item.description}</span>
        ) : null}
      </span>

      {item.badge ? (
        <span className="admin-sidebar-item-badge">{item.badge}</span>
      ) : null}

      {item.disabled ? (
        <LockKeyhole className="admin-sidebar-item-lock" size={14} />
      ) : (
        <ChevronRight className="admin-sidebar-item-arrow" size={15} />
      )}
    </>
  )

  if (!item.to || item.disabled) {
    return (
      <button
        type="button"
        className="admin-sidebar-item is-disabled"
        title={`${item.label} will be enabled later`}
        disabled
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`admin-sidebar-item ${active ? 'is-active' : ''}`}
    >
      {content}
    </Link>
  )
}
