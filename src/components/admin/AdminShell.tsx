import { useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({
  children,
  title = 'Admin Panel',
  subtitle = 'Review applications, approve members and manage digital cards.',
}: {
  children: ReactNode
  title?: string
  subtitle?: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <main className="admin-shell px-3 py-6 sm:px-4 sm:py-8" dir="ltr">
      <div className="admin-shell-wrap">
        <AdminSidebar />

        <section className="admin-shell-content">
          <div className="admin-mobile-bar">
            <div>
              <p className="admin-mobile-eyebrow">BBJF Admin</p>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="admin-mobile-menu-btn"
              aria-label="Open admin menu"
            >
              <Menu size={20} />
            </button>
          </div>

          {children}
        </section>
      </div>

      {mobileOpen ? (
        <div className="admin-mobile-drawer" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-mobile-drawer-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin menu"
          />

          <div className="admin-mobile-drawer-panel">
            <div className="admin-mobile-drawer-header">
              <div>
                <p>BBJF Admin</p>
                <h2>Navigation</h2>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="admin-mobile-drawer-close"
                aria-label="Close admin menu"
              >
                <X size={20} />
              </button>
            </div>

            <div className="admin-mobile-drawer-scroll">
              <AdminSidebar mobile onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
