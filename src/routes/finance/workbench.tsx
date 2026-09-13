import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  BadgeCheck,
  Banknote,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  History,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  UserCog,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  adjustmentKindLabels,
  adjustmentKindOptions,
  campaignProgress,
  campaignStatusLabels,
  campaignStatusOptions,
  donationDisplayName,
  financeRoleLabels,
  financeRoleOptions,
  formatFinanceDate,
  formatMoney,
  fromDateTimeLocal,
  paymentMethodLabels,
  paymentMethodOptions,
  requiresPaymentReference,
  toDateTimeLocal,
  type DonationAdjustment,
  type DonationAdjustmentKind,
  type DonationReceipt,
  type DonationWorkflowEvent,
  type FinanceAccess,
  type FinanceDonation,
  type FinancePaymentMethod,
  type FinanceRole,
  type FinanceRoleAssignment,
  type FundraisingCampaign,
  type FundraisingCampaignStatus,
} from '../../lib/finance'
import { supabase } from '../../lib/supabase/client'
import type { Tables } from '../../lib/supabase/database.types'

export const Route = createFileRoute('/finance/workbench')({ component: FinanceWorkbenchPage })

type OrganizationUnit = Pick<Tables<'organization_units'>, 'id' | 'name' | 'code' | 'level' | 'parent_id' | 'is_active'>

type CampaignForm = {
  title: string
  description: string
  orgUnitId: string
  currency: string
  targetAmount: string
  startsAt: string
  endsAt: string
  status: FundraisingCampaignStatus
}

type DonationForm = {
  campaignId: string
  orgUnitId: string
  donorName: string
  donorMobile: string
  donorEmail: string
  isAnonymous: boolean
  amount: string
  currency: string
  paymentMethod: FinancePaymentMethod
  paymentReference: string
  receivedAt: string
  note: string
}

type AdjustmentForm = {
  kind: DonationAdjustmentKind
  amountDelta: string
  reason: string
  reference: string
}

type FinanceRoleForm = {
  email: string
  role: FinanceRole
  orgUnitId: string
  note: string
}

const emptyCampaignForm: CampaignForm = {
  title: '',
  description: '',
  orgUnitId: '',
  currency: 'PKR',
  targetAmount: '',
  startsAt: '',
  endsAt: '',
  status: 'draft',
}

const emptyDonationForm: DonationForm = {
  campaignId: '',
  orgUnitId: '',
  donorName: '',
  donorMobile: '',
  donorEmail: '',
  isAnonymous: false,
  amount: '',
  currency: 'PKR',
  paymentMethod: 'cash',
  paymentReference: '',
  receivedAt: toDateTimeLocal(new Date().toISOString()),
  note: '',
}

const emptyAdjustmentForm: AdjustmentForm = { kind: 'correction', amountDelta: '', reason: '', reference: '' }
const emptyFinanceRoleForm: FinanceRoleForm = { email: '', role: 'collector', orgUnitId: '', note: '' }

function FinanceWorkbenchPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [access, setAccess] = useState<FinanceAccess>({ can_view: false, can_record: false, can_verify: false, can_reconcile: false, can_admin: false })
  const [orgUnits, setOrgUnits] = useState<OrganizationUnit[]>([])
  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([])
  const [donations, setDonations] = useState<FinanceDonation[]>([])
  const [roleAssignments, setRoleAssignments] = useState<FinanceRoleAssignment[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [selectedDonationId, setSelectedDonationId] = useState('')
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(emptyCampaignForm)
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [donationForm, setDonationForm] = useState<DonationForm>(emptyDonationForm)
  const [verificationNote, setVerificationNote] = useState('')
  const [reconciliationReference, setReconciliationReference] = useState('')
  const [reconciliationNote, setReconciliationNote] = useState('')
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(emptyAdjustmentForm)
  const [adjustments, setAdjustments] = useState<DonationAdjustment[]>([])
  const [receipts, setReceipts] = useState<DonationReceipt[]>([])
  const [workflowEvents, setWorkflowEvents] = useState<DonationWorkflowEvent[]>([])
  const [financeRoleForm, setFinanceRoleForm] = useState<FinanceRoleForm>(emptyFinanceRoleForm)

  const selectedDonation = useMemo(() => donations.find((row) => row.id === selectedDonationId) ?? null, [donations, selectedDonationId])
  const selectedCampaign = useMemo(() => campaigns.find((row) => row.id === selectedCampaignId) ?? null, [campaigns, selectedCampaignId])
  const visibleDonations = useMemo(() => selectedCampaignId ? donations.filter((row) => row.campaign_id === selectedCampaignId) : donations, [donations, selectedCampaignId])
  const metricCurrency = useMemo(() => {
    if (selectedCampaign) return selectedCampaign.currency
    const currencies = Array.from(new Set(visibleDonations.map((row) => row.currency)))
    return currencies.length === 1 ? currencies[0] : null
  }, [selectedCampaign, visibleDonations])
  const totalRecorded = useMemo(() => metricCurrency ? visibleDonations.reduce((sum, row) => sum + Number(row.effective_amount || 0), 0) : 0, [metricCurrency, visibleDonations])
  const totalVerified = useMemo(() => metricCurrency ? visibleDonations.filter((row) => row.verification_state === 'verified').reduce((sum, row) => sum + Number(row.effective_amount || 0), 0) : 0, [metricCurrency, visibleDonations])
  const totalReconciled = useMemo(() => metricCurrency ? visibleDonations.filter((row) => row.reconciliation_state === 'reconciled').reduce((sum, row) => sum + Number(row.effective_amount || 0), 0) : 0, [metricCurrency, visibleDonations])

  useEffect(() => { void loadPage() }, [])
  useEffect(() => {
    if (!selectedDonationId) {
      setAdjustments([])
      setReceipts([])
      setWorkflowEvents([])
      return
    }
    void loadDonationHistory(selectedDonationId)
  }, [selectedDonationId])

  async function loadPage() {
    setLoading(true)
    setError('')
    const { data: userResult } = await supabase.auth.getUser()
    if (!userResult.user) {
      void navigate({ to: '/login' })
      return
    }

    const { data: accessRows, error: accessError } = await supabase.rpc('my_finance_workbench_access')
    if (accessError) {
      setError(accessError.message)
      setLoading(false)
      return
    }

    const nextAccess = ((accessRows ?? [])[0] ?? { can_view: false, can_record: false, can_verify: false, can_reconcile: false, can_admin: false }) as FinanceAccess
    setAccess(nextAccess)
    if (!nextAccess.can_view) {
      setLoading(false)
      return
    }

    const [orgResult, campaignResult, donationResult, roleResult] = await Promise.all([
      supabase.from('organization_units').select('id,name,code,level,parent_id,is_active').eq('is_active', true).order('name'),
      supabase.rpc('list_fundraising_campaigns_for_my_scope'),
      supabase.rpc('list_finance_donations', { p_campaign_id: null }),
      nextAccess.can_admin ? supabase.rpc('list_finance_role_assignments_for_my_scope') : Promise.resolve({ data: [], error: null }),
    ])

    const firstError = orgResult.error ?? campaignResult.error ?? donationResult.error ?? roleResult.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const nextOrgUnits = (orgResult.data ?? []) as OrganizationUnit[]
    const nextCampaigns = (campaignResult.data ?? []) as FundraisingCampaign[]
    const nextDonations = (donationResult.data ?? []) as FinanceDonation[]
    setOrgUnits(nextOrgUnits)
    setCampaigns(nextCampaigns)
    setDonations(nextDonations)
    setRoleAssignments((roleResult.data ?? []) as FinanceRoleAssignment[])

    const defaultOrg = nextCampaigns[0]?.org_unit_id ?? nextDonations[0]?.org_unit_id ?? nextOrgUnits.find((row) => row.code === 'PTI-CENTRAL')?.id ?? nextOrgUnits[0]?.id ?? ''
    setCampaignForm((current) => ({ ...current, orgUnitId: current.orgUnitId || defaultOrg }))
    setDonationForm((current) => ({ ...current, orgUnitId: current.orgUnitId || defaultOrg }))
    setFinanceRoleForm((current) => ({ ...current, orgUnitId: current.orgUnitId || defaultOrg }))
    setLoading(false)
  }

  async function refreshFinanceData(keepDonationId = selectedDonationId) {
    const [campaignResult, donationResult, roleResult] = await Promise.all([
      supabase.rpc('list_fundraising_campaigns_for_my_scope'),
      supabase.rpc('list_finance_donations', { p_campaign_id: null }),
      access.can_admin ? supabase.rpc('list_finance_role_assignments_for_my_scope') : Promise.resolve({ data: [], error: null }),
    ])
    const firstError = campaignResult.error ?? donationResult.error ?? roleResult.error
    if (firstError) {
      setError(firstError.message)
      return
    }
    setCampaigns((campaignResult.data ?? []) as FundraisingCampaign[])
    setDonations((donationResult.data ?? []) as FinanceDonation[])
    setRoleAssignments((roleResult.data ?? []) as FinanceRoleAssignment[])
    if (keepDonationId) await loadDonationHistory(keepDonationId)
  }

  async function loadDonationHistory(donationId: string) {
    const [adjustmentResult, receiptResult, workflowResult] = await Promise.all([
      supabase.rpc('list_donation_adjustments', { p_donation_id: donationId }),
      supabase.rpc('list_donation_receipts', { p_donation_id: donationId }),
      supabase.rpc('list_donation_workflow_events', { p_donation_id: donationId }),
    ])
    const firstError = adjustmentResult.error ?? receiptResult.error ?? workflowResult.error
    if (firstError) {
      setError(firstError.message)
      return
    }
    setAdjustments((adjustmentResult.data ?? []) as DonationAdjustment[])
    setReceipts((receiptResult.data ?? []) as DonationReceipt[])
    setWorkflowEvents((workflowResult.data ?? []) as DonationWorkflowEvent[])
  }

  async function saveCampaign(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { data, error: rpcError } = await supabase.rpc('save_fundraising_campaign', {
      p_campaign_id: editingCampaignId,
      p_org_unit_id: campaignForm.orgUnitId,
      p_payload: {
        title: campaignForm.title,
        description: campaignForm.description,
        currency: campaignForm.currency.toUpperCase(),
        target_amount: campaignForm.targetAmount || null,
        starts_at: fromDateTimeLocal(campaignForm.startsAt),
        ends_at: fromDateTimeLocal(campaignForm.endsAt),
        status: campaignForm.status,
      },
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess(editingCampaignId ? 'Campaign updated.' : 'Campaign created.')
      setEditingCampaignId(null)
      setCampaignForm((current) => ({ ...emptyCampaignForm, orgUnitId: current.orgUnitId }))
      await refreshFinanceData()
      if (data) setSelectedCampaignId(String(data))
    }
    setSaving(false)
  }

  function editCampaign(campaign: FundraisingCampaign) {
    setEditingCampaignId(campaign.id)
    setCampaignForm({
      title: campaign.title,
      description: campaign.description ?? '',
      orgUnitId: campaign.org_unit_id,
      currency: campaign.currency,
      targetAmount: campaign.target_amount == null ? '' : String(campaign.target_amount),
      startsAt: toDateTimeLocal(campaign.starts_at),
      endsAt: toDateTimeLocal(campaign.ends_at),
      status: campaign.status,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function chooseCampaignForDonation(campaign: FundraisingCampaign) {
    setSelectedCampaignId(campaign.id)
    setDonationForm((current) => ({ ...current, campaignId: campaign.id, orgUnitId: campaign.org_unit_id, currency: campaign.currency }))
  }

  async function recordDonation(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { data, error: rpcError } = await supabase.rpc('record_finance_donation', {
      p_campaign_id: donationForm.campaignId || null,
      p_org_unit_id: donationForm.orgUnitId,
      p_payload: {
        donor_name: donationForm.donorName,
        donor_mobile: donationForm.donorMobile,
        donor_email: donationForm.donorEmail,
        is_anonymous: donationForm.isAnonymous,
        amount: donationForm.amount,
        currency: donationForm.currency.toUpperCase(),
        payment_method: donationForm.paymentMethod,
        payment_reference: donationForm.paymentReference,
        received_at: fromDateTimeLocal(donationForm.receivedAt),
        note: donationForm.note,
      },
    })
    if (rpcError) setError(rpcError.message)
    else {
      const createdId = String(data ?? '')
      setSuccess('Donation recorded. It is pending verification and reconciliation.')
      setDonationForm((current) => ({ ...emptyDonationForm, orgUnitId: current.orgUnitId, campaignId: current.campaignId, currency: current.currency, receivedAt: toDateTimeLocal(new Date().toISOString()) }))
      await refreshFinanceData(createdId)
      setSelectedDonationId(createdId)
    }
    setSaving(false)
  }

  async function setVerification(state: 'verified' | 'rejected') {
    if (!selectedDonation) return
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('set_donation_verification', {
      p_donation_id: selectedDonation.id,
      p_state: state,
      p_note: verificationNote || null,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess(`Donation ${state}.`)
      setVerificationNote('')
      await refreshFinanceData(selectedDonation.id)
    }
    setSaving(false)
  }

  async function setReconciliation(state: 'reconciled' | 'exception') {
    if (!selectedDonation) return
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('set_donation_reconciliation', {
      p_donation_id: selectedDonation.id,
      p_state: state,
      p_reference: reconciliationReference || null,
      p_note: reconciliationNote || null,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess(state === 'reconciled' ? 'Donation reconciled.' : 'Reconciliation exception recorded.')
      setReconciliationReference(''); setReconciliationNote('')
      await refreshFinanceData(selectedDonation.id)
    }
    setSaving(false)
  }

  async function addAdjustment(event: FormEvent) {
    event.preventDefault()
    if (!selectedDonation) return
    setSaving(true); setError(''); setSuccess('')
    let amountDelta = Number(adjustmentForm.amountDelta)
    if (adjustmentForm.kind === 'reversal') amountDelta = -Number(selectedDonation.effective_amount)
    const { error: rpcError } = await supabase.rpc('add_donation_adjustment', {
      p_donation_id: selectedDonation.id,
      p_kind: adjustmentForm.kind,
      p_amount_delta: amountDelta,
      p_reason: adjustmentForm.reason,
      p_reference: adjustmentForm.reference || null,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess('Adjustment appended. Verification and reconciliation now require review.')
      setAdjustmentForm(emptyAdjustmentForm)
      await refreshFinanceData(selectedDonation.id)
    }
    setSaving(false)
  }

  async function issueReceipt() {
    if (!selectedDonation) return
    setSaving(true); setError(''); setSuccess('')
    const { data, error: rpcError } = await supabase.rpc('issue_donation_receipt', { p_donation_id: selectedDonation.id })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess(`Receipt ${String(data)} issued.`)
      await refreshFinanceData(selectedDonation.id)
    }
    setSaving(false)
  }

  async function assignFinanceRole(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('assign_finance_role_by_email', {
      p_email: financeRoleForm.email,
      p_role: financeRoleForm.role,
      p_org_unit_id: financeRoleForm.orgUnitId,
      p_note: financeRoleForm.note || null,
    })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess('Finance role assigned.')
      setFinanceRoleForm((current) => ({ ...emptyFinanceRoleForm, orgUnitId: current.orgUnitId }))
      await refreshFinanceData()
    }
    setSaving(false)
  }

  async function revokeFinanceRole(assignmentId: string) {
    setSaving(true); setError(''); setSuccess('')
    const { error: rpcError } = await supabase.rpc('revoke_finance_role', { p_assignment_id: assignmentId })
    if (rpcError) setError(rpcError.message)
    else {
      setSuccess('Finance role revoked.')
      await refreshFinanceData()
    }
    setSaving(false)
  }

  if (loading) return <PageState text="Loading finance workbench…" />
  if (!access.can_view) return <AccessDenied />

  return (
    <main className="min-h-screen bg-[#f8f4ee] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Phase 5 · Fundraising & Finance Ledger</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Transparent collection, verification and reconciliation.</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Original donation records are immutable. Corrections, refunds, chargebacks and reversals are appended as adjustments, with every workflow action captured in the audit trail.</p>
            </div>
            <button type="button" onClick={() => void refreshFinanceData()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-black text-white ring-1 ring-white/20 hover:bg-white/15"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
            <AccessPill active={access.can_record}>Record</AccessPill><AccessPill active={access.can_verify}>Verify / adjust</AccessPill><AccessPill active={access.can_reconcile}>Reconcile</AccessPill><AccessPill active={access.can_admin}>Finance admin</AccessPill>
          </div>
        </header>

        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice tone="success">{success}</Notice> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<CircleDollarSign className="h-5 w-5" />} label="Recorded" value={metricCurrency ? formatMoney(totalRecorded, metricCurrency) : 'Multiple currencies'} />
          <Metric icon={<BadgeCheck className="h-5 w-5" />} label="Verified" value={metricCurrency ? formatMoney(totalVerified, metricCurrency) : 'Multiple currencies'} />
          <Metric icon={<Banknote className="h-5 w-5" />} label="Reconciled" value={metricCurrency ? formatMoney(totalReconciled, metricCurrency) : 'Multiple currencies'} />
          <Metric icon={<ReceiptText className="h-5 w-5" />} label="Ledger entries" value={String(visibleDonations.length)} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            {access.can_verify ? (
              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
                <SectionHeading eyebrow="Campaign control" title={editingCampaignId ? 'Edit fundraising campaign' : 'Create fundraising campaign'} icon={<WalletCards className="h-5 w-5" />} />
                <form onSubmit={saveCampaign} className="mt-5 grid gap-4">
                  <Field label="Campaign title"><input required className={inputClass} value={campaignForm.title} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Organization scope"><select required className={inputClass} disabled={Boolean(editingCampaignId)} value={campaignForm.orgUnitId} onChange={(e) => setCampaignForm({ ...campaignForm, orgUnitId: e.target.value })}><option value="">Select scope</option>{orgUnits.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.level}</option>)}</select></Field>
                    <Field label="Status"><select className={inputClass} value={campaignForm.status} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value as FundraisingCampaignStatus })}>{campaignStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Currency"><input required maxLength={3} className={inputClass} value={campaignForm.currency} onChange={(e) => setCampaignForm({ ...campaignForm, currency: e.target.value.toUpperCase() })} /></Field>
                    <Field label="Target amount"><input type="number" min="0.01" step="0.01" className={inputClass} value={campaignForm.targetAmount} onChange={(e) => setCampaignForm({ ...campaignForm, targetAmount: e.target.value })} /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="Starts"><input type="datetime-local" className={inputClass} value={campaignForm.startsAt} onChange={(e) => setCampaignForm({ ...campaignForm, startsAt: e.target.value })} /></Field><Field label="Ends"><input type="datetime-local" className={inputClass} value={campaignForm.endsAt} onChange={(e) => setCampaignForm({ ...campaignForm, endsAt: e.target.value })} /></Field></div>
                  <Field label="Description"><textarea rows={3} className={inputClass} value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} /></Field>
                  <div className="flex flex-wrap gap-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save className="h-4 w-4" /> {editingCampaignId ? 'Save campaign' : 'Create campaign'}</button>{editingCampaignId ? <button type="button" onClick={() => { setEditingCampaignId(null); setCampaignForm((current) => ({ ...emptyCampaignForm, orgUnitId: current.orgUnitId })) }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600">Cancel edit</button> : null}</div>
                </form>
              </section>
            ) : null}

            <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
              <SectionHeading eyebrow="Campaigns" title="Fundraising portfolio" icon={<CircleDollarSign className="h-5 w-5" />} />
              <div className="mt-5 space-y-3">
                <button type="button" onClick={() => setSelectedCampaignId('')} className={`w-full rounded-2xl border p-4 text-left ${!selectedCampaignId ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}><p className="font-black text-slate-950">All visible finance records</p><p className="mt-1 text-xs font-semibold text-slate-500">Cross-campaign ledger view</p></button>
                {campaigns.map((campaign) => {
                  const progress = campaignProgress(campaign)
                  return <article key={campaign.id} className={`rounded-2xl border p-4 ${selectedCampaignId === campaign.id ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between gap-3"><button type="button" onClick={() => chooseCampaignForDonation(campaign)} className="min-w-0 flex-1 text-left"><p className="truncate font-black text-slate-950">{campaign.title}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">{campaign.campaign_no} · {campaign.org_unit_name}</p></button><StatusBadge tone={campaign.status === 'active' ? 'green' : campaign.status === 'cancelled' ? 'red' : campaign.status === 'paused' ? 'amber' : 'slate'}>{campaignStatusLabels[campaign.status]}</StatusBadge></div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} /></div>
                    <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500"><span>{formatMoney(campaign.verified_total, campaign.currency)} verified</span><span>{campaign.target_amount ? `${progress}% of ${formatMoney(campaign.target_amount, campaign.currency)}` : 'No target'}</span></div>
                    <div className="mt-3 flex flex-wrap gap-2">{access.can_verify ? <button type="button" onClick={() => editCampaign(campaign)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-700">Edit</button> : null}<button type="button" onClick={() => chooseCampaignForDonation(campaign)} className="rounded-lg bg-emerald-100 px-3 py-1.5 text-[10px] font-black text-emerald-800">Open ledger</button></div>
                  </article>
                })}
                {!campaigns.length ? <EmptyState text="No fundraising campaigns in your finance scope yet." /> : null}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {access.can_record ? (
              <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
                <SectionHeading eyebrow="Donation entry" title="Record donation" icon={<Plus className="h-5 w-5" />} />
                <p className="mt-2 text-sm font-semibold text-slate-500">The original ledger row cannot be edited or deleted after recording. Use an adjustment for later corrections.</p>
                <form onSubmit={recordDonation} className="mt-5 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Campaign"><select className={inputClass} value={donationForm.campaignId} onChange={(e) => { const campaign = campaigns.find((row) => row.id === e.target.value); setDonationForm({ ...donationForm, campaignId: e.target.value, orgUnitId: campaign?.org_unit_id ?? donationForm.orgUnitId, currency: campaign?.currency ?? donationForm.currency }) }}><option value="">General / no campaign</option>{campaigns.filter((row) => row.status === 'active').map((row) => <option key={row.id} value={row.id}>{row.campaign_no} · {row.title}</option>)}</select></Field>
                    <Field label="Recording scope"><select required disabled={Boolean(donationForm.campaignId)} className={inputClass} value={donationForm.orgUnitId} onChange={(e) => setDonationForm({ ...donationForm, orgUnitId: e.target.value })}><option value="">Select scope</option>{orgUnits.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3"><Field label="Amount"><input required type="number" min="0.01" step="0.01" className={inputClass} value={donationForm.amount} onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })} /></Field><Field label="Currency"><input required maxLength={3} disabled={Boolean(donationForm.campaignId)} className={inputClass} value={donationForm.currency} onChange={(e) => setDonationForm({ ...donationForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Payment method"><select className={inputClass} value={donationForm.paymentMethod} onChange={(e) => setDonationForm({ ...donationForm, paymentMethod: e.target.value as FinancePaymentMethod })}>{paymentMethodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field></div>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label={`Payment reference${requiresPaymentReference(donationForm.paymentMethod) ? ' *' : ''}`}><input required={requiresPaymentReference(donationForm.paymentMethod)} className={inputClass} value={donationForm.paymentReference} onChange={(e) => setDonationForm({ ...donationForm, paymentReference: e.target.value })} /></Field><Field label="Received at"><input required type="datetime-local" className={inputClass} value={donationForm.receivedAt} onChange={(e) => setDonationForm({ ...donationForm, receivedAt: e.target.value })} /></Field></div>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-black text-slate-700"><input type="checkbox" checked={donationForm.isAnonymous} onChange={(e) => setDonationForm({ ...donationForm, isAnonymous: e.target.checked })} className="h-4 w-4 accent-emerald-700" /> Record donor as anonymous on receipt</label>
                  {!donationForm.isAnonymous ? <div className="grid gap-4 sm:grid-cols-3"><Field label="Donor name"><input className={inputClass} value={donationForm.donorName} onChange={(e) => setDonationForm({ ...donationForm, donorName: e.target.value })} /></Field><Field label="Mobile"><input className={inputClass} value={donationForm.donorMobile} onChange={(e) => setDonationForm({ ...donationForm, donorMobile: e.target.value })} /></Field><Field label="Email"><input type="email" className={inputClass} value={donationForm.donorEmail} onChange={(e) => setDonationForm({ ...donationForm, donorEmail: e.target.value })} /></Field></div> : null}
                  <Field label="Internal note"><textarea rows={2} className={inputClass} value={donationForm.note} onChange={(e) => setDonationForm({ ...donationForm, note: e.target.value })} /></Field>
                  <button disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Record immutable donation</button>
                </form>
              </section>
            ) : null}

            <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
              <SectionHeading eyebrow="Ledger" title={selectedCampaign ? selectedCampaign.title : 'All donations'} icon={<FileText className="h-5 w-5" />} />
              <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Donation</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Reconciliation</th><th className="px-4 py-3">Receipt</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {visibleDonations.map((row) => <tr key={row.id} className={selectedDonationId === row.id ? 'bg-emerald-50/50' : ''}>
                      <td className="px-4 py-3"><button type="button" onClick={() => setSelectedDonationId(row.id)} className="text-left"><p className="font-black text-slate-900">{row.donation_no}</p><p className="mt-0.5 text-xs font-semibold text-slate-500">{donationDisplayName(row)} · {paymentMethodLabels[row.payment_method]}</p></button></td>
                      <td className="px-4 py-3"><p className="font-black text-slate-950">{formatMoney(row.effective_amount,row.currency)}</p>{Number(row.effective_amount)!==Number(row.amount) ? <p className="mt-0.5 text-[10px] font-bold text-amber-700">Original {formatMoney(row.amount,row.currency)}</p> : null}</td>
                      <td className="px-4 py-3"><WorkflowBadge state={row.verification_state} /></td>
                      <td className="px-4 py-3"><WorkflowBadge state={row.reconciliation_state} /></td>
                      <td className="px-4 py-3">{row.latest_receipt_no ? <Link to="/finance/receipt/$receiptNo" params={{ receiptNo: row.latest_receipt_no }} className="text-xs font-black text-emerald-700 no-underline">{row.latest_receipt_no} v{row.latest_receipt_version}</Link> : <span className="text-xs font-bold text-slate-400">Not issued</span>}</td>
                    </tr>)}
                  </tbody>
                </table>
                {!visibleDonations.length ? <EmptyState text="No donations match this campaign view." /> : null}
              </div>
            </section>
          </div>
        </section>

        {selectedDonation ? (
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Ledger record</p><h2 className="mt-1 text-2xl font-black text-slate-950">{selectedDonation.donation_no}</h2><p className="mt-2 text-sm font-semibold text-slate-500">{donationDisplayName(selectedDonation)} · {selectedDonation.org_unit_name} · received {formatFinanceDate(selectedDonation.received_at)}</p></div>
              <div className="flex flex-wrap gap-2"><WorkflowBadge state={selectedDonation.verification_state} /><WorkflowBadge state={selectedDonation.reconciliation_state} /><StatusBadge tone="slate">{formatMoney(selectedDonation.effective_amount,selectedDonation.currency)}</StatusBadge></div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Original record</p>
                <dl className="mt-3 space-y-2 text-xs font-semibold text-slate-600"><Detail label="Original amount" value={formatMoney(selectedDonation.amount,selectedDonation.currency)} /><Detail label="Effective amount" value={formatMoney(selectedDonation.effective_amount,selectedDonation.currency)} /><Detail label="Method" value={paymentMethodLabels[selectedDonation.payment_method]} /><Detail label="Payment ref" value={selectedDonation.payment_reference || '—'} /><Detail label="Campaign" value={selectedDonation.campaign_title || 'General donation'} /><Detail label="Adjustments" value={String(selectedDonation.adjustment_count)} /></dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Verification</p>
                {access.can_verify ? <><textarea rows={3} placeholder="Verification note / rejection reason" className={`${inputClass} mt-3`} value={verificationNote} onChange={(e) => setVerificationNote(e.target.value)} /><div className="mt-3 flex gap-2"><button disabled={saving} type="button" onClick={() => void setVerification('verified')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"><BadgeCheck className="h-4 w-4" /> Verify</button><button disabled={saving} type="button" onClick={() => void setVerification('rejected')} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white"><XCircle className="h-4 w-4" /> Reject</button></div></> : <p className="mt-3 text-xs font-semibold text-slate-500">Read-only verification visibility.</p>}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Reconciliation</p>
                {access.can_reconcile ? <><input placeholder="Bank/batch/reference" className={`${inputClass} mt-3`} value={reconciliationReference} onChange={(e) => setReconciliationReference(e.target.value)} /><textarea rows={2} placeholder="Reconciliation note / exception reason" className={`${inputClass} mt-2`} value={reconciliationNote} onChange={(e) => setReconciliationNote(e.target.value)} /><div className="mt-3 flex gap-2"><button disabled={saving} type="button" onClick={() => void setReconciliation('reconciled')} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"><ClipboardCheck className="h-4 w-4" /> Reconcile</button><button disabled={saving} type="button" onClick={() => void setReconciliation('exception')} className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">Exception</button></div></> : <p className="mt-3 text-xs font-semibold text-slate-500">Read-only reconciliation visibility.</p>}
              </div>
            </div>

            <section className="mt-6 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2"><History className="h-4 w-4 text-slate-600" /><p className="font-black text-slate-950">Verification & reconciliation history</p></div>
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{workflowEvents.map((event, index) => <div key={`${event.event_type}-${event.created_at}-${index}`} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{event.event_type}</p><WorkflowBadge state={event.state} /></div><p className="mt-2 text-xs font-semibold text-slate-600">{event.note || 'No note'}</p>{event.reference ? <p className="mt-1 text-[10px] font-bold text-slate-500">Ref: {event.reference}</p> : null}<p className="mt-2 text-[10px] font-bold text-slate-400">{formatFinanceDate(event.created_at)}</p></div>)}{!workflowEvents.length ? <p className="text-xs font-semibold text-slate-400">No workflow events yet.</p> : null}</div>
            </section>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-amber-700" /><p className="font-black text-slate-950">Adjustments</p></div>
                {access.can_verify ? <form onSubmit={addAdjustment} className="mt-4 grid gap-3"><div className="grid gap-3 sm:grid-cols-2"><Field label="Adjustment type"><select className={inputClass} value={adjustmentForm.kind} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, kind: e.target.value as DonationAdjustmentKind })}>{adjustmentKindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label={adjustmentForm.kind === 'reversal' ? 'Amount' : 'Signed amount delta'}><input required={adjustmentForm.kind !== 'reversal'} disabled={adjustmentForm.kind === 'reversal'} type="number" step="0.01" className={inputClass} value={adjustmentForm.kind === 'reversal' ? String(-Number(selectedDonation.effective_amount)) : adjustmentForm.amountDelta} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amountDelta: e.target.value })} /></Field></div><Field label="Reason"><textarea required rows={2} className={inputClass} value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} /></Field><Field label="Reference"><input className={inputClass} value={adjustmentForm.reference} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reference: e.target.value })} /></Field><button disabled={saving} className="w-fit rounded-xl bg-amber-700 px-3 py-2 text-xs font-black text-white">Append adjustment</button></form> : null}
                <div className="mt-4 space-y-2">{adjustments.map((row) => <div key={row.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-slate-900">{adjustmentKindLabels[row.kind]}</p><p className={`text-xs font-black ${Number(row.amount_delta)<0?'text-red-700':'text-emerald-700'}`}>{formatMoney(row.amount_delta,selectedDonation.currency)}</p></div><p className="mt-1 text-xs font-semibold text-slate-600">{row.reason}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{formatFinanceDate(row.created_at)}{row.reference ? ` · ${row.reference}` : ''}</p></div>)}{!adjustments.length ? <p className="text-xs font-semibold text-slate-400">No adjustments. Original donation remains unchanged.</p> : null}</div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-emerald-700" /><p className="font-black text-slate-950">Receipt history</p></div>{access.can_record ? <button disabled={saving || selectedDonation.verification_state !== 'verified' || Number(selectedDonation.effective_amount)<=0} type="button" onClick={() => void issueReceipt()} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Issue new version</button> : null}</div>
                <p className="mt-2 text-xs font-semibold text-slate-500">Each issue creates a new immutable receipt snapshot. Earlier versions remain in history.</p>
                <div className="mt-4 space-y-2">{receipts.map((row) => <Link key={row.id} to="/finance/receipt/$receiptNo" params={{ receiptNo: row.receipt_no }} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 no-underline"><div><p className="text-xs font-black text-slate-950">{row.receipt_no}</p><p className="mt-1 text-[10px] font-bold text-slate-400">Version {row.version} · {formatFinanceDate(row.issued_at)}</p></div><p className="text-xs font-black text-emerald-800">{formatMoney(row.amount_snapshot,row.currency)}</p></Link>)}{!receipts.length ? <p className="text-xs font-semibold text-slate-400">No receipt issued yet.</p> : null}</div>
              </section>
            </div>
          </section>
        ) : null}

        {access.can_admin ? (
          <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
            <SectionHeading eyebrow="Finance RBAC" title="Scoped finance access" icon={<UserCog className="h-5 w-5" />} />
            <p className="mt-2 text-sm font-semibold text-slate-500">Finance roles are independent from membership and operational coordinator roles. Assignment is scoped to an organization subtree.</p>
            <form onSubmit={assignFinanceRole} className="mt-5 grid gap-4 lg:grid-cols-4"><Field label="Registered account email"><input required type="email" className={inputClass} value={financeRoleForm.email} onChange={(e) => setFinanceRoleForm({ ...financeRoleForm, email: e.target.value })} /></Field><Field label="Finance role"><select className={inputClass} value={financeRoleForm.role} onChange={(e) => setFinanceRoleForm({ ...financeRoleForm, role: e.target.value as FinanceRole })}>{financeRoleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Organization scope"><select required className={inputClass} value={financeRoleForm.orgUnitId} onChange={(e) => setFinanceRoleForm({ ...financeRoleForm, orgUnitId: e.target.value })}><option value="">Select scope</option>{orgUnits.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field><Field label="Note"><input className={inputClass} value={financeRoleForm.note} onChange={(e) => setFinanceRoleForm({ ...financeRoleForm, note: e.target.value })} /></Field><button disabled={saving} className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Assign finance role</button></form>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{roleAssignments.map((row) => <tr key={row.assignment_id}><td className="px-4 py-3 text-xs font-bold text-slate-700">{row.email || row.user_id}</td><td className="px-4 py-3 text-xs font-black text-slate-900">{financeRoleLabels[row.role]}</td><td className="px-4 py-3 text-xs font-semibold text-slate-600">{row.org_unit_name}</td><td className="px-4 py-3">{row.is_active ? <StatusBadge tone="green">Active</StatusBadge> : <StatusBadge tone="slate">Revoked</StatusBadge>}</td><td className="px-4 py-3">{row.is_active ? <button disabled={saving} type="button" onClick={() => void revokeFinanceRole(row.assignment_id)} className="text-xs font-black text-red-700">Revoke</button> : <span className="text-xs font-bold text-slate-400">—</span>}</td></tr>)}</tbody></table>{!roleAssignments.length ? <EmptyState text="No scoped finance roles assigned yet." /> : null}</div>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function AccessPill({ active, children }: { active: boolean; children: ReactNode }) { return <span className={`rounded-full px-3 py-1.5 ${active ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-white/5 text-slate-500 ring-1 ring-white/10'}`}>{children}</span> }
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"><div className="text-emerald-700">{icon}</div><p className="mt-3 text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-xl font-black text-slate-950">{value}</p></div> }
function SectionHeading({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: ReactNode }) { return <div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">{icon}</span><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p><h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2></div></div> }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>{children}</label> }
function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4"><dt className="text-slate-400">{label}</dt><dd className="text-right font-black text-slate-700">{value}</dd></div> }
function EmptyState({ text }: { text: string }) { return <div className="p-5 text-sm font-semibold text-slate-500">{text}</div> }
function Notice({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) { return <div className={`rounded-2xl border p-4 text-sm font-bold ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{children}</div> }
function StatusBadge({ tone, children }: { tone: 'green' | 'red' | 'amber' | 'slate'; children: ReactNode }) { const cls = tone === 'green' ? 'bg-emerald-100 text-emerald-800' : tone === 'red' ? 'bg-red-100 text-red-800' : tone === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${cls}`}>{children}</span> }
function WorkflowBadge({ state }: { state: string }) { const tone = state === 'verified' || state === 'reconciled' ? 'green' : state === 'rejected' || state === 'exception' ? 'red' : 'amber'; return <StatusBadge tone={tone}>{state.replaceAll('_',' ')}</StatusBadge> }
function PageState({ text }: { text: string }) { return <main className="min-h-screen bg-[#f8f4ee] px-4 py-20"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-emerald-700" /><p className="mt-3 text-sm font-black text-slate-700">{text}</p></div></main> }
function AccessDenied() { return <main className="min-h-screen bg-[#f8f4ee] px-4 py-20"><div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200"><ShieldCheck className="mx-auto h-8 w-8 text-slate-400" /><h1 className="mt-4 text-2xl font-black text-slate-950">Finance access not assigned</h1><p className="mt-2 text-sm font-semibold text-slate-500">Membership and volunteer registration do not grant access to financial records. A scoped finance role is required.</p><Link to="/dashboard" className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white no-underline">Back to dashboard</Link></div></main> }

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500'
