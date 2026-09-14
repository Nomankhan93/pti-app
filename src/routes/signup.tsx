import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PasswordInput } from '../components/auth/PasswordInput'
import { PASSWORD_MIN_LENGTH, validatePasswordPolicy } from '../lib/auth/password-policy'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const name = fullName.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!name) {
      setError(t('signup.error.fullNameRequired'))
      return
    }

    if (name.length < 3) {
      setError(t('signup.error.fullNameShort'))
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(t('signup.error.invalidEmail'))
      return
    }

    const policy = validatePasswordPolicy(password)
    if (!policy.valid) {
      setError(t('signup.auth.passwordInvalid'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('signup.error.passwordMismatch'))
      return
    }

    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: name,
          login_method: 'email_password',
        },
      },
    })

    setLoading(false)

    if (signupError) {
      setError(toFriendlySignupError(signupError.message, t))
      return
    }

    if (data.session) {
      await navigate({ to: '/dashboard', replace: true })
      return
    }

    setMessage(t('signup.message.created'))
    window.setTimeout(() => {
      void navigate({ to: '/login', replace: true })
    }, 1200)
  }

  return (
    <main className="pti-auth-page px-4 py-12" dir={direction}>
      <div className="pti-auth-card mx-auto max-w-md p-7 md:p-8">
        <div className="mb-7 text-center">
          <span className="pti-auth-badge">PTI Member</span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.03em] text-slate-950">
            {t('signup.form.title')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t('signup.form.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('authPage.common.fullName')}
            </label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="pti-input"
              placeholder={t('signup.fullName.placeholder')}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('authPage.common.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="pti-input"
              placeholder={t('login.email.placeholder')}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('authPage.common.password')}
            </label>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={t('signup.password.placeholder')}
              autoComplete="new-password"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {t('signup.password.policy')}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('authPage.common.confirmPassword')}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
              placeholder={t('signup.confirmPassword.placeholder')}
              autoComplete="new-password"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="pti-auth-button w-full disabled:opacity-60"
          >
            {loading ? t('signup.submit.loading') : t('signup.submit.cta')}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          {t('signup.haveAccount')}{' '}
          <Link to="/login" className="font-bold text-emerald-700">
            {t('auth.login')}
          </Link>
        </p>
      </div>
    </main>
  )
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function toFriendlySignupError(message: string, t: (key: TranslationKey) => string) {
  const lower = message.toLowerCase()

  if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
    return t('signup.auth.alreadyRegistered')
  }

  if (lower.includes('password')) {
    return t('signup.auth.passwordInvalid')
  }

  if (lower.includes('email')) {
    return t('signup.auth.emailFailed')
  }

  return message
}
