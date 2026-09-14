import { describe, expect, it } from 'vitest'
import { csvSafeCell, normalizeProductionHealth, rowsToCsv, safeExportFilename } from './production'

describe('production hardening helpers', () => {
  it('neutralizes spreadsheet formulas in CSV cells', () => {
    expect(csvSafeCell('=HYPERLINK("https://example.test")')).toBe('"\'=HYPERLINK(""https://example.test"")"')
    expect(csvSafeCell('+123')).toBe('"\'+123"')
  })

  it('creates deterministic CSV columns from the first row', () => {
    expect(rowsToCsv([{ name: 'Noman', amount: 10 }, { name: 'PTI', amount: 20 }])).toBe(
      '"name","amount"\n"Noman","10"\n"PTI","20"',
    )
  })

  it('normalizes a production health payload', () => {
    const result = normalizeProductionHealth({
      status: 'warn',
      database_time: '2026-09-14T00:00:00Z',
      checks: { stale_pending_finance: 3 },
    })
    expect(result?.status).toBe('warn')
    expect(result?.checks.stale_pending_finance).toBe(3)
    expect(result?.checks.rls_missing).toBe(0)
  })

  it('sanitizes export filenames', () => {
    expect(safeExportFilename('Finance Ledger', new Date('2026-09-14T01:02:03Z'))).toBe(
      'pti-finance-ledger-2026-09-14_01-02-03-000Z.csv',
    )
  })
})
