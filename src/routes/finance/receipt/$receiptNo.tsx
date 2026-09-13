import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Printer, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatFinanceDate, formatMoney, paymentMethodLabels, type FinancePaymentMethod } from '../../../lib/finance'
import { supabase } from '../../../lib/supabase/client'

export const Route = createFileRoute('/finance/receipt/$receiptNo')({ component: FinanceReceiptPage })

type Receipt = {
  receipt_no: string
  version: number
  issued_at: string
  donation_no: string
  campaign_no: string | null
  campaign_title: string | null
  org_unit_name: string
  amount: number
  currency: string
  donor_name: string | null
  payment_method: FinancePaymentMethod
  payment_reference: string | null
  received_at: string
}

function FinanceReceiptPage() {
  const { receiptNo } = Route.useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  useEffect(() => { void loadReceipt() }, [receiptNo])

  async function loadReceipt() {
    setLoading(true); setError('')
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { void navigate({ to: '/login' }); return }
    const { data, error: rpcError } = await supabase.rpc('get_finance_receipt', { p_receipt_no: receiptNo })
    if (rpcError) setError(rpcError.message)
    else setReceipt(((data ?? [])[0] ?? null) as Receipt | null)
    setLoading(false)
  }

  if (loading) return <main className="min-h-screen bg-[#f8f4ee] px-4 py-20"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-700" /></main>
  if (error || !receipt) return <main className="min-h-screen bg-[#f8f4ee] px-4 py-20"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><ShieldCheck className="mx-auto h-8 w-8 text-slate-400" /><h1 className="mt-4 text-2xl font-black text-slate-950">Receipt unavailable</h1><p className="mt-2 text-sm font-semibold text-slate-500">{error || 'Receipt was not found in your authorized finance scope.'}</p><Link to="/finance/workbench" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white no-underline">Back to finance</Link></div></main>

  return <main className="min-h-screen bg-[#f8f4ee] px-4 py-8 print:bg-white print:p-0">
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-between gap-3 print:hidden"><Link to="/finance/workbench" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 no-underline">Back to finance</Link><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white"><Printer className="h-4 w-4" /> Print receipt</button></div>
      <article className="overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
        <header className="bg-slate-950 p-7 text-white sm:p-10"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Pakistan Tehreek-e-Insaf</p><h1 className="mt-3 text-3xl font-black">Donation Receipt</h1><p className="mt-2 text-sm font-semibold text-slate-300">Digitally issued finance record</p></div><ReceiptText className="h-12 w-12 text-emerald-300" /></div></header>
        <div className="p-7 sm:p-10">
          <div className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><Detail label="Receipt no" value={receipt.receipt_no} /><Detail label="Version" value={String(receipt.version)} /><Detail label="Donation no" value={receipt.donation_no} /><Detail label="Issued" value={formatFinanceDate(receipt.issued_at)} /></div>
          <div className="mt-7 text-center"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Received amount</p><p className="mt-2 text-4xl font-black text-emerald-800">{formatMoney(receipt.amount,receipt.currency)}</p><p className="mt-3 text-sm font-semibold text-slate-600">Received from <span className="font-black text-slate-900">{receipt.donor_name || 'Donor not named'}</span></p></div>
          <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2"><Detail label="Campaign" value={receipt.campaign_title ? `${receipt.campaign_no ?? ''} ${receipt.campaign_title}`.trim() : 'General donation'} /><Detail label="Organization" value={receipt.org_unit_name} /><Detail label="Payment method" value={paymentMethodLabels[receipt.payment_method]} /><Detail label="Payment reference" value={receipt.payment_reference || '—'} /><Detail label="Received at" value={formatFinanceDate(receipt.received_at)} /></div>
          <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-900">This receipt is an immutable snapshot of the verified donation amount at the time of issue. If a later correction, refund, chargeback or reversal occurs, a newer receipt version may be issued while earlier versions remain in the audit history.</div>
          <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">PTI Digital Operations Platform · Finance Ledger</p>
        </div>
      </article>
    </div>
  </main>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-black text-slate-900">{value}</p></div> }
