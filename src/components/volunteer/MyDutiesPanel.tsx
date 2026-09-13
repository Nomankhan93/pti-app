import { BadgeCheck, CalendarClock, CheckCircle2, Clock3, MapPin, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  dutyNextActions,
  dutyStatusLabels,
  formatOperationDate,
  type DutyStatus,
  type MyDutyAssignment,
} from '../../lib/operations'
import { supabase } from '../../lib/supabase/client'

export function MyDutiesPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(enabled)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [items, setItems] = useState<MyDutyAssignment[]>([])

  useEffect(() => {
    if (enabled) void loadAssignments()
  }, [enabled])

  async function loadAssignments() {
    setLoading(true); setError('')
    const { data, error: loadError } = await supabase.rpc('list_my_duty_assignments')
    if (loadError) setError(loadError.message)
    else setItems((data ?? []) as MyDutyAssignment[])
    setLoading(false)
  }

  async function updateStatus(assignment: MyDutyAssignment, status: DutyStatus) {
    setSavingId(assignment.assignment_id); setError('')
    const note = status === 'unable' ? window.prompt('Optional reason for being unable to attend:') ?? '' : ''
    const { error: updateError } = await supabase.rpc('update_my_duty_status', {
      p_assignment_id: assignment.assignment_id,
      p_status: status,
      p_note: note,
    })
    if (updateError) setError(updateError.message)
    else await loadAssignments()
    setSavingId('')
  }

  if (!enabled) return null

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Operations</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">My assigned duties</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">Accept assigned work, start it when you are on duty, and mark completion. Attendance and participation are tracked separately below your duty list.</p>
        </div>
        <button type="button" onClick={() => void loadAssignments()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}
      {loading ? <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading assignments…</div> : null}
      {!loading && !items.length ? <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">No duties have been assigned to you yet.</div> : null}

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const actions = dutyNextActions(item.status)
          return (
            <article key={item.assignment_id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase text-white">{dutyStatusLabels[item.status]}</span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">{item.priority}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{item.duty_title}</h3>
                  <p className="mt-1 text-sm font-bold text-emerald-700">{item.operation_title}</p>
                </div>
                <p className="text-xs font-bold text-slate-400">Assigned {formatOperationDate(item.assigned_at)}</p>
              </div>

              <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <Meta icon={<CalendarClock className="h-4 w-4" />} text={formatOperationDate(item.starts_at)} />
                <Meta icon={<MapPin className="h-4 w-4" />} text={item.location || 'Location to be confirmed'} />
                <Meta icon={<BadgeCheck className="h-4 w-4" />} text={item.team_name || 'Individual duty'} />
                <Meta icon={<Clock3 className="h-4 w-4" />} text={item.shift_name || 'No named shift'} />
              </div>

              {item.instructions ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{item.instructions}</p> : null}
              {item.response_note ? <p className="mt-3 text-xs font-semibold text-slate-500">Note: {item.response_note}</p> : null}

              {actions.length ? <div className="mt-4 flex flex-wrap gap-2">{actions.map((status) => <button key={status} type="button" disabled={savingId === item.assignment_id} onClick={() => void updateStatus(item, status)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black text-white disabled:opacity-50 ${status === 'unable' ? 'bg-red-700' : status === 'completed' ? 'bg-emerald-700' : 'bg-slate-950'}`}>{status === 'unable' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}{dutyStatusLabels[status]}</button>)}</div> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <span className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">{icon}<span className="truncate">{text}</span></span>
}
