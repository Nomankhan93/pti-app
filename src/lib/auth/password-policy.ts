export const PASSWORD_MIN_LENGTH = 8

export type PasswordPolicyResult = {
  valid: boolean
  reason: 'length' | 'letter' | 'digit' | null
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, reason: 'length' }
  }

  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, reason: 'letter' }
  }

  if (!/\d/.test(password)) {
    return { valid: false, reason: 'digit' }
  }

  return { valid: true, reason: null }
}
