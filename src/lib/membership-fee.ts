// src/lib/membership-fee.ts
// BBJF manual membership-fee helpers adapted from the JAS membership portal.
// Fee remains BBJF-specific at Rs. 500; payment account/QR details match JAS.

export const MEMBERSHIP_BASE_FEE = 500
export const MEMBERSHIP_FEE_CURRENCY = 'PKR'
export const MEMBERSHIP_PROCESSING_LABEL = 'applicable tax/processing charges'
export const MEMBERSHIP_PAYMENT_COMING_SOON_TEXT =
  'Manual payment receipt verification pending.'

export const MEMBERSHIP_RECEIPT_BUCKET = 'membership-receipts'
export const MEMBERSHIP_RECEIPT_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const MEMBERSHIP_RECEIPT_MAX_SIZE_LABEL = '5MB'
export const MEMBERSHIP_RECEIPT_ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]

export const MEMBERSHIP_PAYMENT_QR_IMAGE_PATH = '/bbjf/membership-payment-qr.jpg'

export const MEMBERSHIP_MANUAL_PAYMENT_DETAILS = {
  bankName: 'Mobilink Microfinance Bank',
  accountTitle: 'Abdur shop',
  accountNumber: '01333300393',
  iban: 'PK08JCMA1905921333300393',
  paymentNetwork: 'JazzCash / Raast',
  tillId: '983365478',
} as const

export type MembershipPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'waived'

export type MembershipPaymentMethod =
  | 'manual'
  | 'jazzcash'
  | 'easypaisa'
  | 'bank'
  | 'gateway'

export type MembershipPayment = {
  id: string
  member_id: string
  user_id: string
  base_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: MembershipPaymentStatus
  payment_method: MembershipPaymentMethod
  gateway_provider: string | null
  gateway_reference: string | null
  receipt_path: string | null
  receipt_file_name: string | null
  receipt_mime_type: string | null
  receipt_size_bytes: number | null
  receipt_uploaded_at: string | null
  admin_note: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type MembershipPaymentReceiptPayload = {
  receipt_path?: string | null
  receipt_file_name?: string | null
  receipt_mime_type?: string | null
  receipt_size_bytes?: number | null
  receipt_uploaded_at?: string | null
}

export function formatMembershipMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0)

  return `Rs. ${amount.toLocaleString('en-PK', {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    minimumFractionDigits: 0,
  })}`
}

export function getMembershipFeeNotice() {
  return `Membership Application Fee: ${formatMembershipMoney(
    MEMBERSHIP_BASE_FEE,
  )} + ${MEMBERSHIP_PROCESSING_LABEL}.`
}

export function getMembershipFeeSubtext() {
  return 'Final payable amount will be shown before payment.'
}

export function getManualMembershipPaymentInstruction() {
  return `Send the membership application fee to ${MEMBERSHIP_MANUAL_PAYMENT_DETAILS.bankName} account ${MEMBERSHIP_MANUAL_PAYMENT_DETAILS.accountNumber} or scan the provided QR code, then upload the payment receipt before submitting your application.`
}

export function getMembershipPaymentQrHelpText() {
  return `You can pay through ${MEMBERSHIP_MANUAL_PAYMENT_DETAILS.paymentNetwork} by scanning the QR code or using Till ID ${MEMBERSHIP_MANUAL_PAYMENT_DETAILS.tillId}.`
}

export function getMembershipPaymentStatusLabel(
  status: MembershipPaymentStatus | null | undefined,
) {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'failed':
      return 'Failed'
    case 'cancelled':
      return 'Cancelled'
    case 'refunded':
      return 'Refunded'
    case 'waived':
      return 'Waived'
    default:
      return 'Pending'
  }
}

export function getMembershipPaymentStatusClass(
  status: MembershipPaymentStatus | null | undefined,
) {
  switch (status) {
    case 'paid':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'waived':
      return 'border-sky-200 bg-sky-50 text-sky-800'
    case 'failed':
    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'refunded':
      return 'border-purple-200 bg-purple-50 text-purple-800'
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800'
  }
}

export function getMembershipPaymentDisplayStatus(
  payment: Pick<MembershipPayment, 'status'> | null | undefined,
) {
  return payment?.status ?? 'pending'
}

export function createPendingMembershipPaymentPayload(
  memberId: string,
  userId: string,
  receipt?: MembershipPaymentReceiptPayload,
) {
  return {
    member_id: memberId,
    user_id: userId,
    base_amount: MEMBERSHIP_BASE_FEE,
    tax_amount: 0,
    total_amount: MEMBERSHIP_BASE_FEE,
    currency: MEMBERSHIP_FEE_CURRENCY,
    status: 'pending' as const,
    payment_method: 'bank' as const,
    gateway_provider: 'manual_mobilink_microfinance_bank',
    gateway_reference: null,
    receipt_path: receipt?.receipt_path ?? null,
    receipt_file_name: receipt?.receipt_file_name ?? null,
    receipt_mime_type: receipt?.receipt_mime_type ?? null,
    receipt_size_bytes: receipt?.receipt_size_bytes ?? null,
    receipt_uploaded_at: receipt?.receipt_uploaded_at ?? null,
  }
}
