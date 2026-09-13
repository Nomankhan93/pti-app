import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import QRCode from 'qrcode'
import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  QrCode,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  UserCheck,
  UserX,
  UsersRound,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  attendanceRate,
  attendanceStatusLabels,
  attendanceStatusOptions,
  formatAttendanceDate,
  type AttendanceOperationSummary,
  type AttendanceRosterRow,
  type AttendanceSession,
  type AttendanceStatus,
} from '../../lib/attendance'
import { fromDateTimeLocal, toDateTimeLocal, type OperationShift } from '../../lib/operations'
import { supabase } from '../../lib/supabase/client'

export const Route = createFileRoute('/operations/attendance')({ component: AttendanceWorkbenchPage })

type Access = { can_view: boolean; can_manage: boolean }

type SessionForm = {
  shiftId: string
  opensAt: string
  closesAt: string
  lateAfter: string
  requireAssignment: boolean
}

const emptySessionForm: SessionForm = {
  shiftId: '',
  opensAt: '',
  closesAt: '',
  lateAfter: '',
  requireAssignment: true,
}

function AttendanceWorkbenchPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [access, setAccess] = useState<Access>({ can_view: false, can_manage: false })
  const [operations, setOperations] = useState<AttendanceOperationSummary[]>([])
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [shifts, setShifts] = useState<OperationShift[]>([])
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [roster, setRoster] = useState<AttendanceRosterRow[]>([])
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm)

  useEffect(() => { void loadPage() }, [])
  useEffect(() => {
    if (selectedOperationId) void loadOperationAttendance(selectedOperationId, selectedShiftId)
  }, [selectedOperationId, selectedShiftId])

  const selectedOperation = useMemo(
    () => operations.find((item) => item.operation_id === selectedOperationId) ?? null,
    [operations, selectedOperationId],
  )

  const rosterStats = useMemo(() => {
    const present = roster.filter((row) => row.status === 'present').length
    const late = roster.filter((row) => row.status === 'late').length
    const absent = roster.filter((row) => row.status === 'absent').length
    const excused = roster.filter((row) => row.status === 'excused').length
    return { present, late, absent, excused, rate: attendanceRate(present, late, absent, excused) }
  }, [roster])

  async function loadPage() {
    setLoading(true)
    setError('')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { void navigate({ to: '/login' }); return }

    const { data: accessRows, error: accessError } = await supabase.rpc('my_attendance_workbench_access')
    if (accessError) { setError(accessError.message); setLoading(false); return }
    const nextAccess = ((accessRows ?? [])[0] ?? { can_view: false, can_manage: false }) as Access
    setAccess(nextAccess)
    if (!nextAccess.can_view) { setLoading(false); return }

    const { data, error: operationsError } = await supabase.rpc('list_attendance_operations_for_my_scope')
    if (operationsError) { setError(operationsError.message); setLoading(false); return }
    const nextOperations = (data ?? []) as AttendanceOperationSummary[]
    setOperations(nextOperations)
    if (!selectedOperationId && nextOperations[0]) setSelectedOperationId(nextOperations[0].operation_id)
    setLoading(false)
  }

  async function loadOperationAttendance(operationId: string, shiftId: string) {
    setError('')
    const [shiftResult, sessionResult, rosterResult] = await Promise.all([
      supabase.from('operation_shifts').select('*').eq('operation_id', operationId).eq('is_active', true).order('starts_at'),
      supabase.rpc('list_attendance_sessions', { p_operation_id: operationId }),
      supabase.rpc('list_operation_attendance_roster', { p_operation_id: operationId, p_shift_id: shiftId || null }),
    ])
    const firstError = shiftResult.error ?? sessionResult.error ?? rosterResult.error
    if (firstError) { setError(firstError.message); return }
    setShifts((shiftResult.data ?? []) as OperationShift[])
    setSessions((sessionResult.data ?? []) as AttendanceSession[])
    setRoster((rosterResult.data ?? []) as AttendanceRosterRow[])
  }

  function startSessionForCurrentTarget() {
    const shift = shifts.find((item) => item.id === selectedShiftId)
    const start = shift?.starts_at ?? selectedOperation?.starts_at ?? new Date().toISOString()
    const end = shift?.ends_at ?? selectedOperation?.ends_at ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    const startMs = Math.max(Date.now() - 15 * 60 * 1000, new Date(start).getTime() - 30 * 60 * 1000)
    const endMs = Math.max(Date.now() + 60 * 60 * 1000, new Date(end).getTime() + 30 * 60 * 1000)
    setSessionForm({
      shiftId: selectedShiftId,
      opensAt: toDateTimeLocal(new Date(startMs).toISOString()),
      closesAt: toDateTimeLocal(new Date(endMs).toISOString()),
      lateAfter: toDateTimeLocal(new Date(Math.max(Date.now() + 15 * 60 * 1000, new Date(start).getTime() + 15 * 60 * 1000)).toISOString()),
      requireAssignment: true,
    })
  }

  async function createSession(event: FormEvent) {
    event.preventDefault()
    if (!selectedOperationId) return
    const opensAt = fromDateTimeLocal(sessionForm.opensAt)
    const closesAt = fromDateTimeLocal(sessionForm.closesAt)
    const lateAfter = fromDateTimeLocal(sessionForm.lateAfter)
    if (!opensAt || !closesAt) { setError('Attendance open and close time are required.'); return }
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('create_attendance_session', {
      p_operation_id: selectedOperationId,
      p_shift_id: sessionForm.shiftId || null,
      p_opens_at: opensAt,
      p_closes_at: closesAt,
      p_late_after: lateAfter,
      p_require_assignment: sessionForm.requireAssignment,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess('QR attendance session opened.')
      setSessionForm(emptySessionForm)
      await loadOperationAttendance(selectedOperationId, selectedShiftId)
      await loadPage()
    }
    setSaving(false)
  }

  async function closeSession(sessionId: string) {
    if (!window.confirm('Close this attendance QR session? New check-ins using this QR will stop immediately.')) return
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('close_attendance_session', { p_session_id: sessionId })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess('Attendance session closed.')
      await loadOperationAttendance(selectedOperationId, selectedShiftId)
      await loadPage()
    }
    setSaving(false)
  }

  async function markAttendance(row: AttendanceRosterRow, status: AttendanceStatus) {
    if (!selectedOperationId) return
    const note = status === 'excused' || status === 'absent' ? window.prompt('Optional attendance note:') ?? '' : row.note ?? ''
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('set_attendance_record', {
      p_operation_id: selectedOperationId,
      p_shift_id: selectedShiftId || null,
      p_volunteer_id: row.volunteer_id,
      p_status: status,
      p_note: note,
    })
    if (rpcError) setError(rpcError.message)
    else await loadOperationAttendance(selectedOperationId, selectedShiftId)
    setSaving(false)
  }

  async function checkOut(recordId: string) {
    setSaving(true); setError('')
    const { error: rpcError } = await supabase.rpc('check_out_attendance_record', { p_record_id: recordId })
    if (rpcError) setError(rpcError.message)
    else await loadOperationAttendance(selectedOperationId, selectedShiftId)
    setSaving(false)
  }

  if (loading) return <PageState text="Loading attendance workbench…" />
  if (!access.can_view) return <AccessDenied />

  return (
    <main className="min-h-screen bg-[#f8f4ee] pb-16">
      <div className="page-wrap py-8">
        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">Phase 4</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Attendance & Participation</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/65">Open time-bound QR check-in sessions, mark attendance manually, track check-out and maintain volunteer participation history.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/operations/workbench" className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white no-underline ring-1 ring-white/15">Operations</Link>
              <Link to="/operations/volunteers" className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white no-underline ring-1 ring-white/15">Volunteers</Link>
            </div>
          </div>
        </div>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice tone="success">{success}</Notice> : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-[21rem_1fr]">
          <aside className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-2">
              <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Operations</p><p className="text-sm font-black text-slate-900">Attendance scope</p></div>
              <button type="button" onClick={() => void loadPage()} className="rounded-xl bg-slate-100 p-2 text-slate-600"><RefreshCw className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-2">
              {operations.map((item) => (
                <button key={item.operation_id} type="button" onClick={() => { setSelectedOperationId(item.operation_id); setSelectedShiftId('') }} className={`w-full rounded-2xl border p-3 text-left transition ${selectedOperationId === item.operation_id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                  <p className="text-sm font-black text-slate-950">{item.operation_title}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.org_unit_name}</p>
                  <div className="mt-2 flex gap-2 text-[10px] font-black uppercase text-slate-500"><span>{item.engaged_volunteers} engaged</span><span>•</span><span>{item.active_sessions} active QR</span></div>
                </button>
              ))}
              {!operations.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No operations are visible in your scope.</p> : null}
            </div>
          </aside>

          <div className="space-y-5">
            {selectedOperation ? (
              <>
                <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-emerald-700">{selectedOperation.org_unit_name}</p>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedOperation.operation_title}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">Choose operation-level attendance or a specific shift.</p>
                    </div>
                    <label className="block min-w-64"><span className="mb-1 block text-xs font-black uppercase text-slate-400">Attendance target</span><select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)} className={inputClass}><option value="">Whole operation</option>{shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}</select></label>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Metric icon={<UsersRound className="h-4 w-4" />} label="Roster" value={String(roster.length)} />
                    <Metric icon={<UserCheck className="h-4 w-4" />} label="Present" value={String(rosterStats.present)} />
                    <Metric icon={<TimerReset className="h-4 w-4" />} label="Late" value={String(rosterStats.late)} />
                    <Metric icon={<UserX className="h-4 w-4" />} label="Absent" value={String(rosterStats.absent)} />
                    <Metric icon={<BadgeCheck className="h-4 w-4" />} label="Attendance" value={`${rosterStats.rate}%`} />
                  </div>
                </section>

                <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">QR Check-in</p><h2 className="mt-1 text-xl font-black text-slate-950">Attendance sessions</h2><p className="mt-1 text-sm font-semibold text-slate-500">Each QR uses a random server token and a strict open/close window.</p></div>
                    {access.can_manage ? <button type="button" onClick={startSessionForCurrentTarget} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white"><QrCode className="h-4 w-4" /> New QR session</button> : null}
                  </div>

                  {access.can_manage && sessionForm.opensAt ? (
                    <form onSubmit={createSession} className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <Field label="Opens"><input type="datetime-local" value={sessionForm.opensAt} onChange={(e) => setSessionForm({ ...sessionForm, opensAt: e.target.value })} className={inputClass} /></Field>
                        <Field label="Closes"><input type="datetime-local" value={sessionForm.closesAt} onChange={(e) => setSessionForm({ ...sessionForm, closesAt: e.target.value })} className={inputClass} /></Field>
                        <Field label="Late after"><input type="datetime-local" value={sessionForm.lateAfter} onChange={(e) => setSessionForm({ ...sessionForm, lateAfter: e.target.value })} className={inputClass} /></Field>
                        <label className="flex items-end"><span className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700"><input type="checkbox" checked={sessionForm.requireAssignment} onChange={(e) => setSessionForm({ ...sessionForm, requireAssignment: e.target.checked })} className="h-4 w-4 accent-emerald-700" /> Assigned volunteers only</span></label>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2"><button disabled={saving} type="submit" className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Open QR session</button><button type="button" onClick={() => setSessionForm(emptySessionForm)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600">Cancel</button></div>
                    </form>
                  ) : null}

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {sessions.map((session) => <SessionCard key={session.session_id} session={session} canManage={access.can_manage} onClose={closeSession} />)}
                    {!sessions.length ? <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">No attendance sessions created for this operation yet.</div> : null}
                  </div>
                </section>

                <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
                  <div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Roster</p><h2 className="mt-1 text-xl font-black text-slate-950">Participant attendance</h2><p className="mt-1 text-sm font-semibold text-slate-500">Roster includes engaged volunteers plus anyone who already checked in to the selected target.</p></div>
                  <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Volunteer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Check in</th><th className="px-4 py-3">Check out</th><th className="px-4 py-3">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {roster.map((row) => (
                          <tr key={row.volunteer_id}>
                            <td className="px-4 py-3"><p className="font-black text-slate-900">{row.full_name}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{row.org_unit_name} · {row.mobile}</p></td>
                            <td className="px-4 py-3">{row.status ? <AttendanceBadge status={row.status} /> : <span className="text-xs font-bold text-slate-400">Not marked</span>}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{formatAttendanceDate(row.check_in_at)}</td>
                            <td className="px-4 py-3 text-xs font-semibold text-slate-600">{formatAttendanceDate(row.check_out_at)}</td>
                            <td className="px-4 py-3">
                              {access.can_manage ? <div className="flex min-w-64 flex-wrap gap-1.5">{attendanceStatusOptions.map((status) => <button key={status.value} disabled={saving} type="button" onClick={() => void markAttendance(row, status.value)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black ${row.status === status.value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{status.label}</button>)}{row.record_id && row.check_in_at && !row.check_out_at && (row.status === 'present' || row.status === 'late') ? <button type="button" onClick={() => void checkOut(row.record_id!)} className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[10px] font-black text-emerald-800">Check out</button> : null}</div> : <span className="text-xs font-bold text-slate-400">Read only</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!roster.length ? <div className="p-6 text-sm font-semibold text-slate-500">No engaged volunteers or attendance records for this target yet.</div> : null}
                  </div>
                </section>
              </>
            ) : <div className="rounded-[2rem] bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200/70">Select an operation to manage attendance.</div>}
          </div>
        </section>
      </div>
    </main>
  )
}

function SessionCard({ session, canManage, onClose }: { session: AttendanceSession; canManage: boolean; onClose: (id: string) => Promise<void> }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  useEffect(() => {
    if (!session.token || typeof window === 'undefined') { setQrDataUrl(''); return }
    const url = `${window.location.origin}/attendance/check-in/${session.token}`
    void QRCode.toDataURL(url, { width: 260, margin: 2 }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [session.token])

  return <article className={`rounded-2xl border p-4 ${session.is_active ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'}`}>
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-400">{session.shift_name || 'Whole operation'}</p><p className="mt-1 font-black text-slate-950">{session.is_active ? 'Active QR session' : 'Closed session'}</p></div>{session.is_active ? <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-black uppercase text-white">Live</span> : null}</div>
    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600"><span className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> {formatAttendanceDate(session.opens_at)} → {formatAttendanceDate(session.closes_at)}</span><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Late after: {formatAttendanceDate(session.late_after)}</span><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {session.require_assignment ? 'Assigned volunteers only' : 'Open to active volunteers inside operation scope'}</span></div>
    {session.is_active && session.token && canManage ? <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">{qrDataUrl ? <img src={qrDataUrl} alt="Attendance check-in QR" className="h-36 w-36 rounded-xl bg-white p-2 ring-1 ring-slate-200" /> : <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200"><RefreshCw className="h-5 w-5 animate-spin" /></div>}<div className="min-w-0"><p className="text-xs font-black uppercase text-slate-400">Check-in link</p><p className="mt-1 break-all text-xs font-semibold text-slate-600">/attendance/check-in/{session.token}</p><button type="button" onClick={() => void onClose(session.session_id)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white"><XCircle className="h-4 w-4" /> Close QR session</button></div></div> : null}
    {session.is_active && !canManage ? <p className="mt-4 rounded-xl bg-white p-3 text-xs font-semibold text-slate-500">QR token is hidden in read-only mode.</p> : null}
  </article>
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const cls = status === 'present' ? 'bg-emerald-100 text-emerald-800' : status === 'late' ? 'bg-amber-100 text-amber-800' : status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${cls}`}>{attendanceStatusLabels[status]}</span>
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-4"><div className="text-emerald-700">{icon}</div><p className="mt-2 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>{children}</label> }
function Notice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) { return <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{children}</div> }
function PageState({ text }: { text: string }) { return <main className="min-h-screen bg-[#f8f4ee] px-4 py-20"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-700" /><p className="mt-3 text-sm font-black text-slate-700">{text}</p></div></main> }
function AccessDenied() { return <main className="min-h-screen bg-[#f8f4ee] px-4 py-20"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><ShieldCheck className="mx-auto h-8 w-8 text-slate-400" /><h1 className="mt-4 text-2xl font-black text-slate-950">Attendance access not assigned</h1><p className="mt-2 text-sm font-semibold text-slate-500">Your organization role does not include attendance visibility.</p><Link to="/dashboard" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white no-underline">Back to dashboard</Link></div></main> }
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100'
