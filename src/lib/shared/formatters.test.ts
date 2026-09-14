import { describe, expect, it } from 'vitest'
import {
  csvCell,
  formatCnicInput,
  formatMobileInput,
  maskCnic,
  maskMobile,
  normalizeMobile,
} from './formatters'

describe('sensitive data formatters', () => {
  it('masks CNIC and mobile values for admin exports by default', () => {
    expect(maskCnic('42301-1234567-1')).toBe('42301-*****67-1')
    expect(maskMobile('03001234567')).toBe('0300*****67')
    expect(maskMobile('+923001234567')).toBe('+92300*****67')
  })

  it('normalizes Pakistani mobile numbers', () => {
    expect(normalizeMobile('00923001234567')).toBe('+923001234567')
    expect(normalizeMobile('923001234567')).toBe('+923001234567')
  })

  it('formats CNIC and mobile input safely', () => {
    expect(formatCnicInput('4230112345671')).toBe('42301-1234567-1')
    expect(formatMobileInput('00923001234567')).toBe('+923001234567')
  })

  it('escapes CSV cells and neutralizes spreadsheet formulas', () => {
    expect(csvCell('Ali "Test", Khan')).toBe('"Ali ""Test"", Khan"')
    expect(csvCell('=HYPERLINK("https://example.com")')).toBe(`"'=HYPERLINK(""https://example.com"")"`)
    expect(csvCell('+123')).toBe(`"'+123"`)
    expect(csvCell('-10')).toBe(`"'-10"`)
    expect(csvCell('@SUM(A1:A2)')).toBe(`"'@SUM(A1:A2)"`)
  })
})
