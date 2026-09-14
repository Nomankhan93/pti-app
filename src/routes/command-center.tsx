import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  BellRing,
  CheckCircle2,
  Clock3,
  Megaphone,
  RefreshCw,
  Send,
  ShieldAlert,
  Target,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  financeNotificationRoles,
  formatNotificationDate,
  notificationAudienceLabels,
  notificationKindLabels,
  notificationSeverityLabels,
  organizationNotificationRoles,
  readRate,
  roleLabel,
  severityTone,
  type CommandCenterAccess,
  type CommandCenterMessage,
  type NotificationAudience,
  type NotificationKind,
  type NotificationOperation,
  type NotificationScope,
  type NotificationSeverity,
} from '../lib/notifications'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/command-center')({ component: CommandCenterPage })

type ComposeForm = {
  scopeId: string
  kind: NotificationKind
  severity: NotificationSeverity
  audience: NotificationAudience
  operationId: string
  title: string
  body: string
  actionUrl: string
  expiresAt: string
  organizationRoles: string[]
  financeRoles: string[]
}

const initialForm: ComposeForm = {
  scopeId: '',
  kind: 'announcement',
  severity: 'info',
  audience: 'org_scope',
  operationId: '',
  title: '',
  body: '',
  actionUrl: '',
  expiresAt: '',
  organizationRoles: [],
  financeRoles: [],
}

function CommandCenterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [access, setAccess] = useState<CommandCenterAccess | null>(null)
  const [scopes, setScopes] = useState<NotificationScope[]>([])
  const [operations, setOperations] = useState<NotificationOperation[]>([])
  const [messages, setMessages] = useState<CommandCenterMessage[]>([])
  const [form, setForm] = useState<ComposeForm>(initialForm)
  const [reminderHours, setReminderHours] = useState('24')

  const selectedScope = useMemo(() => scopes.find((scope) => scope.id === form.scopeId) ?? null, [form.scopeId, scopes])
  const activeMessages = useMemo(() => messages.filter((message) => message.status === 'published'), [messages])
  const totalRecipients = useMemo(() => activeMessages.reduce((sum, message) => sum + Number(message.recipient_count || 0), 0), [activeMessages])
  const totalUnread = useMemo(() => activeMessages.reduce((sum, message) => sum + Number(message.unread_count || 0), 0), [activeMessages])

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    if (!form.scopeId) return
    void loadOperations(form.scopeId)
    void loadMessages(form.scopeId)
  }, [form.scopeId])

  async function bootstrap() {
    setLoading(true)
    setError('')
    const { data: userResult } = await supabase.auth.getUser()
    if (!userResult.user) {
      void navigate({ to: '/login' })
      return
    }

    const { data: accessRows, error: accessError } = await (supabase as any).rpc('my_command_center_access')
    if (accessError) {
      setError(accessError.message)
      setLoading(false)
      return
    }

    const nextAccess = ((accessRows ?? [])[0] ?? null) as CommandCenterAccess | null
    setAccess(nextAccess)
    if (!nextAccess?.can_view) {
      setLoading(false)
      return
    }

    const { data: scopeRows, error: scopeError } = await (supabase as any).rpc('list_notification_scopes')
    if (scopeError) {
      setError(scopeError.message)
      setLoading(false)
      return
    }
    const nextScopes = (scopeRows ?? []) as NotificationScope[]
    setScopes(nextScopes)
    const defaultScopeId = nextAccess.default_org_unit_id && nextScopes.some((row) => row.id === nextAccess.default_org_unit_id)
      ? nextAccess.default_org_unit_id
      : nextScopes[0]?.id ?? ''
    setForm((current) => ({ ...current, scopeId: defaultScopeId }))
    if (!defaultScopeId) setLoading(false)
  }

  async function loadOperations(scopeId: string) {
    const { data, error: rpcError } = await (supabase as any).rpc('list_notification_operations', { p_org_unit_id: scopeId })
    if (rpcError) setError(rpcError.message)
    else {
      const rows = (data ?? []) as NotificationOperation[]
      setOperations(rows)
      setForm((current) => ({
        ...current,
        operationId: rows.some((row) => row.id === current.operationId) ? current.operationId : '',
      }))
    }
  }

  async function loadMessages(scopeId = form.scopeId) {
    if (!scopeId) return
    const { data, error: rpcError } = await (supabase as any).rpc('list_command_center_messages', {
      p_org_unit_id: scopeId,
      p_limit: 50,
    })
    if (rpcError) setError(rpcError.message)
    else setMessages((data ?? []) as CommandCenterMessage[])
    setLoading(false)
  }

  function toggleRole(kind: 'organizationRoles' | 'financeRoles', value: string) {
    setForm((current) => ({
      ...current,
      [kind]: current[kind].includes(value)
        ? current[kind].filter((item) => item !== value)
        : [...current[kind], value],
    }))
  }

  async function publish(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const targetSpec: Record<string, unknown> = {}
    if (form.audience === 'organization_roles') targetSpec.organization_roles = form.organizationRoles
    if (form.audience === 'finance_roles') targetSpec.finance_roles = form.financeRoles

    const { data, error: rpcError } = await (supabase as any).rpc('publish_notification', {
      p_org_unit_id: form.scopeId,
      p_kind: form.kind,
      p_severity: form.severity,
      p_title: form.title,
      p_body: form.body,
      p_audience: form.audience,
      p_operation_id: form.operationId || null,
      p_action_url: form.actionUrl || null,
      p_expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      p_target_spec: targetSpec,
    })

    if (rpcError) setError(rpcError.message)
    else {
      const result = data as { recipient_count?: number; notification_no?: string } | null
      setSuccess(`Notification ${result?.notification_no ?? ''} published to ${result?.recipient_count ?? 0} recipient(s).`)
      setForm((current) => ({
        ...initialForm,
        scopeId: current.scopeId,
        operationId: '',
      }))
      await loadMessages()
    }
    setSaving(false)
  }

  async function cancelMessage(messageId: string) {
    setSaving(true)
    setError('')
    setSuccess('')
    const { error: rpcError } = await (supabase as any).rpc('cancel_notification', { p_message_id: messageId })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess('Notification cancelled. It will no longer appear in active recipient inboxes.')
      await loadMessages()
    }
    setSaving(false)
  }

  async function generateReminders() {
    setSaving(true)
    setError('')
    setSuccess('')
    const { data, error: rpcError } = await (supabase as any).rpc('generate_due_duty_reminders', {
      p_horizon_hours: Number(reminderHours),
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess(`${Number(data ?? 0)} due duty reminder(s) generated.`)
      await loadMessages()
    }
    setSaving(false)
  }

  if (loading) {
    return <main className="page-wrap py-16"><div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center font-black text-slate-500">Loading command center…</div></main>
  }

  if (!access?.can_view) {
    return (
      <main className="page-wrap py-16">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-700" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">Command center access required</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">This workspace is limited to authorized leadership, coordinators, supervisors and auditors.</p>
          <Link to="/dashboard" className="mt-5 inline-block font-black text-emerald-700 no-underline">Back to dashboard</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap py-8 sm:py-12">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-950/5 backdrop-blur-xl">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-5 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <Activity className="h-4 w-4" /> Phase 7
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Operational Command Center</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                Publish scoped announcements and alerts, notify operation participants, and generate due-duty reminders from one controlled workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={form.scopeId}
                onChange={(event) => setForm((current) => ({ ...current, scopeId: event.target.value }))}
                className="min-w-[15rem] rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-black text-white outline-none [&>option]:text-slate-950"
              >
                {scopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.name} · {roleLabel(scope.level)}</option>)}
              </select>
              <button type="button" onClick={() => void loadMessages()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/15">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
          {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{success}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<BellRing className="h-5 w-5" />} label="Published" value={activeMessages.length} />
            <Metric icon={<UsersRound className="h-5 w-5" />} label="Deliveries" value={totalRecipients} />
            <Metric icon={<Target className="h-5 w-5" />} label="Unread" value={totalUnread} />
            <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Read rate" value={`${readRate(totalRecipients - totalUnread, totalRecipients)}%`} />
          </div>

          {access.can_manage ? (
            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
              <form onSubmit={(event) => void publish(event)} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Megaphone className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-xl font-black text-slate-950">Publish targeted update</h2>
                    <p className="text-sm font-semibold text-slate-500">Recipients are resolved server-side from your authorized organization scope.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Type">
                    <select value={form.kind} onChange={(e) => setForm((c) => ({ ...c, kind: e.target.value as NotificationKind }))} className="field-select">
                      {(Object.keys(notificationKindLabels) as NotificationKind[]).map((value) => <option key={value} value={value}>{notificationKindLabels[value]}</option>)}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select value={form.severity} onChange={(e) => setForm((c) => ({ ...c, severity: e.target.value as NotificationSeverity }))} className="field-select">
                      {(Object.keys(notificationSeverityLabels) as NotificationSeverity[]).map((value) => <option key={value} value={value}>{notificationSeverityLabels[value]}</option>)}
                    </select>
                  </Field>
                  <Field label="Audience">
                    <select value={form.audience} onChange={(e) => setForm((c) => ({ ...c, audience: e.target.value as NotificationAudience }))} className="field-select">
                      {(Object.keys(notificationAudienceLabels) as NotificationAudience[]).filter((value) => value !== 'specific_users').map((value) => <option key={value} value={value}>{notificationAudienceLabels[value]}</option>)}
                    </select>
                  </Field>
                  <Field label="Operation (when relevant)">
                    <select value={form.operationId} onChange={(e) => setForm((c) => ({ ...c, operationId: e.target.value }))} className="field-select">
                      <option value="">No operation</option>
                      {operations.map((operation) => <option key={operation.id} value={operation.id}>{operation.title} · {operation.status}</option>)}
                    </select>
                  </Field>
                </div>

                {form.audience === 'organization_roles' ? (
                  <RoleChooser title="Organization roles" values={[...organizationNotificationRoles]} selected={form.organizationRoles} onToggle={(value) => toggleRole('organizationRoles', value)} />
                ) : null}
                {form.audience === 'finance_roles' ? (
                  <RoleChooser title="Finance roles" values={[...financeNotificationRoles]} selected={form.financeRoles} onToggle={(value) => toggleRole('financeRoles', value)} />
                ) : null}

                <div className="mt-4 grid gap-4">
                  <Field label="Title"><input required maxLength={160} value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} className="field-select" placeholder="What people need to know" /></Field>
                  <Field label="Message"><textarea required maxLength={4000} rows={5} value={form.body} onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))} className="field-select resize-y" placeholder="Clear operational instructions or announcement details" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Action URL (optional)"><input value={form.actionUrl} onChange={(e) => setForm((c) => ({ ...c, actionUrl: e.target.value }))} className="field-select" placeholder="/volunteer" /></Field>
                    <Field label="Expires at (optional)"><input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((c) => ({ ...c, expiresAt: e.target.value }))} className="field-select" /></Field>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">Scope: <span className="text-slate-900">{selectedScope?.name ?? '—'}</span>. Direct table writes remain blocked; publishing is audited.</p>
                  <button disabled={saving || !form.scopeId} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:opacity-60">
                    <Send className="h-4 w-4" /> Publish
                  </button>
                </div>
              </form>

              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/70 p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Clock3 className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-lg font-black text-slate-950">Duty reminder sweep</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Generate one deduplicated reminder for each assigned/accepted duty starting inside the selected horizon and within your manageable operation scope.</p>
                  </div>
                </div>
                <select value={reminderHours} onChange={(e) => setReminderHours(e.target.value)} className="field-select mt-5">
                  <option value="6">Next 6 hours</option>
                  <option value="12">Next 12 hours</option>
                  <option value="24">Next 24 hours</option>
                  <option value="48">Next 48 hours</option>
                  <option value="72">Next 72 hours</option>
                </select>
                <button type="button" onClick={() => void generateReminders()} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-3 text-sm font-black text-white hover:bg-amber-800 disabled:opacity-60">
                  <BellRing className="h-4 w-4" /> Generate due reminders
                </button>
                <p className="mt-4 text-xs font-bold leading-5 text-amber-800">New duty assignments already create immediate notifications automatically. This sweep is for time-based reminders.</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Notification activity</h2>
                <p className="text-sm font-semibold text-slate-500">Latest 50 messages visible in your authorized scope.</p>
              </div>
              <Link to="/notifications" className="text-sm font-black text-emerald-700 no-underline">Open my inbox</Link>
            </div>

            <div className="grid gap-3">
              {messages.length === 0 ? <p className="rounded-2xl bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">No notification activity in this scope yet.</p> : messages.map((message) => (
                <article key={message.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${severityTone(message.severity)}`}>{message.severity}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">{notificationKindLabels[message.kind]}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${message.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{message.status}</span>
                      </div>
                      <h3 className="mt-3 font-black text-slate-950">{message.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-slate-600">{message.body}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
                        <span>{message.org_unit_name}</span>
                        <span>{notificationAudienceLabels[message.audience]}</span>
                        <span>{formatNotificationDate(message.published_at)}</span>
                        <span>{message.notification_no}</span>
                      </div>
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
                      <MiniMetric label="Sent" value={message.recipient_count} />
                      <MiniMetric label="Read" value={message.read_count} />
                      <MiniMetric label="Rate" value={`${readRate(message.read_count, message.recipient_count)}%`} />
                    </div>
                    {access.can_manage && message.status === 'published' ? (
                      <button type="button" onClick={() => void cancelMessage(message.id)} disabled={saving} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-60">
                        <XCircle className="h-4 w-4" /> Cancel
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><p className="text-2xl font-black text-slate-950">{value}</p></div></div></div>
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-[4.5rem] rounded-xl bg-slate-50 px-2 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-black text-slate-900">{value}</p></div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-black text-slate-700"><span>{label}</span>{children}</label>
}

function RoleChooser({ title, values, selected, onToggle }: { title: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => {
          const active = selected.includes(value)
          return <button key={value} type="button" onClick={() => onToggle(value)} className={`rounded-full border px-3 py-1.5 text-xs font-black ${active ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{roleLabel(value)}</button>
        })}
      </div>
    </div>
  )
}
