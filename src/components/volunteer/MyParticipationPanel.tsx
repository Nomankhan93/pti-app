import { BadgeCheck, Clock3, History, LogOut, RefreshCw, TimerReset } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  attendanceStatusLabels,
  formatAttendanceDate,
  participationHours,
  type ParticipationHistoryRow,
  type ParticipationSummary,
} from '../../lib/attendance'
import { supabase } from '../../lib/supabase/client'

export function MyParticipationPanel({ enabled }: { enabled: boolean }) {
  const [loading, setLoading] = useState(enabled)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<ParticipationHistoryRow[]>([])
  const [summary, setSummary] = useState<ParticipationSummary | null>(null)

  useEffect(() => {
    if (enabled) void load()
  }, [enabled])

  async function load() {
    setLoading(true)
    setError('')
    const [historyResult, summaryResult] = await Promise.all([
      supabase.rpc('list_my_participation_history'),
      supabase.rpc('my_participation_summary'),
    ])
    if (historyResult.error) setError(historyResult.error.message)
    else setHistory((historyResult.data ?? []) as ParticipationHistoryRow[])
    if (!summaryResult.error) setSummary((summaryResult.data?.[0] ?? null) as ParticipationSummary | null)
    setLoading(false)
  }

  async function checkOut(recordId: string) {
    setSavingId(recordId)
    setError('')
    const { error: rpcError } = await supabase.rpc('check_out_my_attendance', { p_record_id: recordId })
    if (rpcError) setError(rpcError.message)
    else await load()
    setSavingId('')
  }

  if (!enabled) return null

  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Participation</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">My attendance & participation</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">QR or coordinator-marked attendance, check-out times and participation history.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {summary ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Operations" value={String(summary.operations_participated)} icon={<History className="h-4 w-4" />} />
          <Metric label="Present" value={String(summary.present_count)} icon={<BadgeCheck className="h-4 w-4" />} />
          <Metric label="Late" value={String(summary.late_count)} icon={<TimerReset className="h-4 w-4" />} />
          <Metric label="Completed duties" value={String(summary.completed_duties)} icon={<BadgeCheck className="h-4 w-4" />} />
          <Metric label="Tracked hours" value={`${Number(summary.total_hours ?? 0).toFixed(1)}h`} icon={<Clock3 className="h-4 w-4" />} />
        </div>
      ) : null}

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{error}</div> : null}
      {loading ? <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Loading participation…</div> : null}
      {!loading && !history.length ? <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">No attendance has been recorded yet. When an operation opens QR check-in, scan the event QR while logged in.</div> : null}

      <div className="mt-5 space-y-3">
        {history.map((item) => {
          const canCheckOut = (item.attendance_status === 'present' || item.attendance_status === 'late') && item.check_in_at && !item.check_out_at
          return (
            <article key={item.record_id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.attendance_status} />
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{item.attendance_source === 'qr' ? 'QR check-in' : 'Coordinator marked'}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-black text-slate-950">{item.operation_title}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.shift_name || 'Operation attendance'}</p>
                </div>
                {canCheckOut ? (
                  <button type="button" disabled={savingId === item.record_id} onClick={() => void checkOut(item.record_id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">
                    <LogOut className="h-4 w-4" /> Check out
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-3">
                <Meta label="Check in" value={formatAttendanceDate(item.check_in_at)} />
                <Meta label="Check out" value={formatAttendanceDate(item.check_out_at)} />
                <Meta label="Tracked time" value={`${participationHours(item.check_in_at, item.check_out_at).toFixed(2)}h`} />
              </div>
              {item.note ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">Note: {item.note}</p> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><div className="text-emerald-700">{icon}</div><p className="mt-2 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 truncate font-bold text-slate-700">{value}</p></div>
}

function StatusBadge({ status }: { status: ParticipationHistoryRow['attendance_status'] }) {
  const cls = status === 'present' ? 'bg-emerald-100 text-emerald-800' : status === 'late' ? 'bg-amber-100 text-amber-800' : status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${cls}`}>{attendanceStatusLabels[status]}</span>
}
