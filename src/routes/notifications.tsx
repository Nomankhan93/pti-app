import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Archive,
  Bell,
  BellRing,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  formatNotificationDate,
  notificationKindLabels,
  severityTone,
  type InboxNotification,
} from '../lib/notifications'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/notifications')({ component: NotificationsPage })

function NotificationsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [workingId, setWorkingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [items, setItems] = useState<InboxNotification[]>([])
  const [hasMore, setHasMore] = useState(false)

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items])

  useEffect(() => {
    void bootstrap()
  }, [])

  function broadcastChange() {
    window.dispatchEvent(new CustomEvent('pti:notifications-changed'))
  }

  async function bootstrap() {
    setLoading(true)
    setError('')
    const { data: userResult } = await supabase.auth.getUser()
    if (!userResult.user) {
      void navigate({ to: '/login' })
      return
    }
    await loadNotifications(false)
    setLoading(false)
  }

  async function loadNotifications(append: boolean) {
    append ? setLoadingMore(true) : setLoading(true)
    setError('')
    const before = append && items.length ? items[items.length - 1]?.delivered_at ?? null : null
    const { data, error: rpcError } = await supabase.rpc('list_my_notifications', {
      p_limit: 50,
      p_before: before,
    })

    if (rpcError) {
      setError(rpcError.message)
    } else {
      const rows = (data ?? []) as InboxNotification[]
      setItems((current) => (append ? [...current, ...rows] : rows))
      setHasMore(rows.length === 50)
    }
    setLoading(false)
    setLoadingMore(false)
  }

  async function markRead(deliveryId: number) {
    setWorkingId(deliveryId)
    const { error: rpcError } = await supabase.rpc('mark_my_notification_read', {
      p_delivery_id: deliveryId,
    })
    if (rpcError) setError(rpcError.message)
    else {
      const now = new Date().toISOString()
      setItems((current) => current.map((item) => item.delivery_id === deliveryId ? { ...item, read_at: item.read_at ?? now } : item))
      broadcastChange()
    }
    setWorkingId(null)
  }

  async function markAllRead() {
    setWorkingId(-1)
    const { error: rpcError } = await supabase.rpc('mark_all_my_notifications_read')
    if (rpcError) setError(rpcError.message)
    else {
      const now = new Date().toISOString()
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })))
      broadcastChange()
    }
    setWorkingId(null)
  }

  async function archive(deliveryId: number) {
    setWorkingId(deliveryId)
    const { error: rpcError } = await supabase.rpc('archive_my_notification', {
      p_delivery_id: deliveryId,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setItems((current) => current.filter((item) => item.delivery_id !== deliveryId))
      broadcastChange()
    }
    setWorkingId(null)
  }

  async function followAction(item: InboxNotification) {
    if (!item.read_at) await markRead(item.delivery_id)
  }

  if (loading && !items.length) {
    return (
      <main className="page-wrap py-16">
        <div className="flex min-h-[20rem] items-center justify-center rounded-[2rem] border border-slate-200 bg-white/80 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap py-8 sm:py-12">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-950/5 backdrop-blur-xl">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-5 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <BellRing className="h-4 w-4" /> Phase 7
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Notifications & Updates</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                Announcements, operational alerts, duty reminders and updates targeted to your PTI responsibilities.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadNotifications(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={workingId === -1}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {workingId === -1 ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-8">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={<Inbox className="h-5 w-5" />} label="Visible" value={items.length} />
            <Metric icon={<Bell className="h-5 w-5" />} label="Unread" value={unreadCount} />
            <Metric icon={<CheckCheck className="h-5 w-5" />} label="Read" value={items.length - unreadCount} />
          </div>

          {items.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <Bell className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-black text-slate-950">No active notifications</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">New targeted announcements and operational updates will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => {
                const isUnread = !item.read_at
                return (
                  <article
                    key={item.delivery_id}
                    className={`rounded-[1.5rem] border p-4 shadow-sm transition sm:p-5 ${isUnread ? 'border-emerald-200 bg-emerald-50/45' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${severityTone(item.severity)}`}>
                            {item.severity}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                            {notificationKindLabels[item.kind]}
                          </span>
                          {isUnread ? <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Unread" /> : null}
                        </div>
                        <h2 className="mt-3 text-lg font-black text-slate-950">{item.title}</h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">{item.body}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
                          <span>{item.org_unit_name}</span>
                          <span>{formatNotificationDate(item.published_at)}</span>
                          <span>{item.notification_no}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => void markRead(item.delivery_id)}
                            disabled={workingId === item.delivery_id}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            <CheckCheck className="h-4 w-4" /> Read
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void archive(item.delivery_id)}
                          disabled={workingId === item.delivery_id}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          <Archive className="h-4 w-4" /> Archive
                        </button>
                        {item.action_url ? (
                          <a
                            href={item.action_url}
                            onClick={() => void followAction(item)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white no-underline hover:bg-emerald-800"
                          >
                            Open <ChevronRight className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              onClick={() => void loadNotifications(true)}
              disabled={loadingMore}
              className="mx-auto inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load more
            </button>
          ) : null}

          <div className="flex justify-end">
            <Link to="/dashboard" className="text-sm font-black text-emerald-700 no-underline hover:text-emerald-900">Back to dashboard</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  )
}
