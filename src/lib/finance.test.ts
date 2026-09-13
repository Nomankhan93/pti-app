import { describe, expect, it } from 'vitest'
import { campaignProgress, donationDisplayName, formatMoney, requiresPaymentReference } from './finance'

describe('finance helpers', () => {
  it('caps campaign progress at 100', () => {
    expect(campaignProgress({ target_amount: 1000, verified_total: 1250 })).toBe(100)
    expect(campaignProgress({ target_amount: 1000, verified_total: 400 })).toBe(40)
  })

  it('protects anonymous donor display names', () => {
    expect(donationDisplayName({ is_anonymous: true, donor_name: 'Private Name' })).toBe('Anonymous donor')
    expect(donationDisplayName({ is_anonymous: false, donor_name: 'Noman' })).toBe('Noman')
  })

  it('marks non-cash payment methods as reference-bearing methods', () => {
    expect(requiresPaymentReference('cash')).toBe(false)
    expect(requiresPaymentReference('bank_transfer')).toBe(true)
    expect(requiresPaymentReference('online_wallet')).toBe(true)
  })

  it('formats an amount without throwing for a normal currency', () => {
    expect(formatMoney(1500, 'PKR')).toContain('1,500')
  })
})
