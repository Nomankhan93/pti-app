import { createFileRoute, Link } from '@tanstack/react-router'
import { BadgeCheck, Clock3, LogIn, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { attendanceStatusLabels, formatAttendanceDate, type AttendanceStatus } from '../../../lib/attendance'
import { supabase } from '../../../lib/supabase/client'

export const Route = createFileRoute('/attendance/check-in/$token')({ component: AttendanceCheckInPage })

type CheckInResult = {
  record_id: string
  operation_title: string
  shift_name: string | null
  status: AttendanceStatus
  check_in_at: string
  check_out_at: string | null
}

function AttendanceCheckInPage() {
  const { token } = Route.useParams()
  const [loading, setLoading] = useState(true)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CheckInResult | null>(null)

  useEffect(() => { void checkIn() }, [token])

  async function checkIn() {
    setLoading(true); setError(''); setNeedsLogin(false)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { setNeedsLogin(true); setLoading(false); return }
    const { data, error: rpcError } = await supabase.rpc('check_in_with_attendance_token', { p_token: token })
    if (rpcError) setError(rpcError.message)
    else setResult(((data ?? [])[0] ?? null) as CheckInResult | null)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f8f4ee] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-6 text-center shadow-xl ring-1 ring-slate-200/70 sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldCheck className="h-7 w-7" /></div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">PTI Attendance</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Operation check-in</h1>

        {loading ? <div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Verifying attendance session…</div> : null}

        {needsLogin ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left"><div className="flex items-start gap-3"><LogIn className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-black text-amber-950">Login required</p><p className="mt-1 text-sm font-semibold leading-6 text-amber-800">Attendance QR check-in requires your PTI account and an active volunteer profile. Login, then scan this QR again.</p></div></div><Link to="/login" className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white no-underline">Open login</Link></div> : null}

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"><XCircle className="mx-auto h-7 w-7 text-red-700" /><p className="mt-3 font-black text-red-900">Check-in not accepted</p><p className="mt-1 text-sm font-semibold leading-6 text-red-700">{error}</p><button type="button" onClick={() => void checkIn()} className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-800">Try again</button></div> : null}

        {result ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><BadgeCheck className="mx-auto h-9 w-9 text-emerald-700" /><p className="mt-3 text-lg font-black text-emerald-950">Check-in recorded</p><p className="mt-1 text-sm font-bold text-emerald-800">{result.operation_title}</p><div className="mt-4 grid gap-2 text-left sm:grid-cols-2"><Info label="Attendance" value={attendanceStatusLabels[result.status]} /><Info label="Shift" value={result.shift_name || 'Whole operation'} /><Info label="Check-in" value={formatAttendanceDate(result.check_in_at)} icon={<Clock3 className="h-4 w-4" />} /><Info label="Check-out" value={formatAttendanceDate(result.check_out_at)} /></div><Link to="/volunteer" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white no-underline">Open participation history</Link></div> : null}
      </div>
    </main>
  )
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 flex items-center gap-1.5 text-xs font-black text-slate-800">{icon}{value}</p></div> }
