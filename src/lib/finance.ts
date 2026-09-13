export type FundraisingCampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
export type FinancePaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'online_wallet' | 'cheque' | 'other'
export type FinanceRole = 'finance_admin' | 'finance_officer' | 'collector' | 'auditor'
export type DonationVerificationState = 'pending' | 'verified' | 'rejected'
export type DonationReconciliationState = 'pending' | 'reconciled' | 'exception'
export type DonationAdjustmentKind = 'correction' | 'reversal' | 'refund' | 'chargeback'

export type FinanceAccess = {
  can_view: boolean
  can_record: boolean
  can_verify: boolean
  can_reconcile: boolean
  can_admin: boolean
}

export type FundraisingCampaign = {
  id: string
  campaign_no: string
  org_unit_id: string
  org_unit_name: string
  title: string
  description: string | null
  currency: string
  target_amount: number | null
  starts_at: string | null
  ends_at: string | null
  status: FundraisingCampaignStatus
  donation_count: number
  recorded_total: number
  verified_total: number
  reconciled_total: number
  created_at: string
  updated_at: string
}

export type FinanceDonation = {
  id: string
  donation_no: string
  campaign_id: string | null
  campaign_no: string | null
  campaign_title: string | null
  org_unit_id: string
  org_unit_name: string
  donor_name: string | null
  donor_mobile: string | null
  donor_email: string | null
  is_anonymous: boolean
  amount: number
  effective_amount: number
  currency: string
  payment_method: FinancePaymentMethod
  payment_reference: string | null
  received_at: string
  collector_user_id: string | null
  recorded_by: string
  note: string | null
  verification_state: DonationVerificationState
  reconciliation_state: DonationReconciliationState
  latest_receipt_no: string | null
  latest_receipt_version: number | null
  adjustment_count: number
  created_at: string
}

export type DonationAdjustment = {
  id: string
  kind: DonationAdjustmentKind
  amount_delta: number
  reason: string
  reference: string | null
  created_by: string
  created_at: string
}

export type DonationReceipt = {
  id: string
  receipt_no: string
  version: number
  amount_snapshot: number
  currency: string
  donor_name_snapshot: string | null
  payment_method: FinancePaymentMethod
  payment_reference_snapshot: string | null
  issued_by: string
  issued_at: string
}

export type FinanceRoleAssignment = {
  assignment_id: string
  user_id: string
  email: string | null
  role: FinanceRole
  org_unit_id: string
  org_unit_name: string
  assigned_at: string
  is_active: boolean
  revoked_at: string | null
  note: string | null
}

export const campaignStatusOptions: Array<{ value: FundraisingCampaignStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const paymentMethodOptions: Array<{ value: FinancePaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'online_wallet', label: 'Online wallet' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

export const financeRoleOptions: Array<{ value: FinanceRole; label: string; description: string }> = [
  { value: 'finance_admin', label: 'Finance Admin', description: 'Campaigns, ledger, workflow and scoped finance-role administration.' },
  { value: 'finance_officer', label: 'Finance Officer', description: 'Record, verify, reconcile, adjust and receipt donations.' },
  { value: 'collector', label: 'Collector', description: 'Record scoped donations and issue receipts after verification.' },
  { value: 'auditor', label: 'Finance Auditor', description: 'Read-only scoped finance visibility.' },
]

export const adjustmentKindOptions: Array<{ value: DonationAdjustmentKind; label: string }> = [
  { value: 'correction', label: 'Correction' },
  { value: 'refund', label: 'Refund' },
  { value: 'chargeback', label: 'Chargeback' },
  { value: 'reversal', label: 'Full reversal' },
]

export const campaignStatusLabels = Object.fromEntries(campaignStatusOptions.map((item) => [item.value, item.label])) as Record<FundraisingCampaignStatus, string>
export const paymentMethodLabels = Object.fromEntries(paymentMethodOptions.map((item) => [item.value, item.label])) as Record<FinancePaymentMethod, string>
export const financeRoleLabels = Object.fromEntries(financeRoleOptions.map((item) => [item.value, item.label])) as Record<FinanceRole, string>
export const adjustmentKindLabels = Object.fromEntries(adjustmentKindOptions.map((item) => [item.value, item.label])) as Record<DonationAdjustmentKind, string>

export function formatMoney(amount: number | string | null | undefined, currency = 'PKR') {
  const value = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0)
  } catch {
    return `${currency} ${(Number.isFinite(value) ? value : 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
  }
}

export function formatFinanceDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function campaignProgress(campaign: Pick<FundraisingCampaign, 'target_amount' | 'verified_total'>) {
  if (!campaign.target_amount || campaign.target_amount <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((Number(campaign.verified_total) / Number(campaign.target_amount)) * 100)))
}

export function donationDisplayName(donation: Pick<FinanceDonation, 'is_anonymous' | 'donor_name'>) {
  return donation.is_anonymous ? 'Anonymous donor' : donation.donor_name || 'Donor not named'
}

export function requiresPaymentReference(method: FinancePaymentMethod) {
  return method !== 'cash' && method !== 'other'
}

export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function fromDateTimeLocal(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export type DonationWorkflowEvent = {
  event_type: 'verification' | 'reconciliation'
  state: string
  reference: string | null
  note: string | null
  actor_id: string
  created_at: string
}
