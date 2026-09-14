import { describe, expect, it } from 'vitest'
import { PASSWORD_MIN_LENGTH, validatePasswordPolicy } from './password-policy'

describe('password policy', () => {
  it('matches the hosted Supabase minimum length', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })

  it('requires a letter and a digit', () => {
    expect(validatePasswordPolicy('12345678').valid).toBe(false)
    expect(validatePasswordPolicy('abcdefgh').valid).toBe(false)
    expect(validatePasswordPolicy('abc12345')).toEqual({ valid: true, reason: null })
  })
})
