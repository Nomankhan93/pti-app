import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { PasswordInput } from '../components/auth/PasswordInput'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

type SignupMethod = 'email' | 'phone'

function SignupPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()
  const [method, setMethod] = useState<SignupMethod>('email')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function resetAlerts() {
    setError('')
    setMessage('')
  }

  function switchMethod(nextMethod: SignupMethod) {
    setMethod(nextMethod)
    resetAlerts()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetAlerts()

    const name = fullName.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = normalizePakistanPhone(phone)

    if (!name) {
      setError(t('signup.error.fullNameRequired'))
      return
    }

    if (name.length < 3) {
      setError(t('signup.error.fullNameShort'))
      return
    }

    if (method === 'email' && !isValidEmail(normalizedEmail)) {
      setError(t('signup.error.invalidEmail'))
      return
    }

    if (method === 'phone' && !isValidPakistanMobile(normalizedPhone)) {
      setError(t('signup.error.invalidPhone'))
      return
    }

    if (password.length < 6) {
      setError(t('signup.error.passwordShort'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('signup.error.passwordMismatch'))
      return
    }

    setLoading(true)

    const { data, error: signupError } =
      method === 'email'
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: {
                full_name: name,
                login_method: 'email_password',
              },
            },
          })
        : await supabase.auth.signUp({
            phone: normalizedPhone,
            password,
            options: {
              data: {
                full_name: name,
                login_method: 'phone_password',
              },
            },
          })

    setLoading(false)

    if (signupError) {
      setError(toFriendlySignupError(signupError.message, t))
      return
    }

    if (method === 'phone') {
      setPhone(normalizedPhone)
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
    <main className="bbjf-auth-page px-4 py-12" dir={direction}>
      <div className="bbjf-auth-card mx-auto max-w-md p-7 md:p-8">
        <div className="mb-7 text-center">
          <span className="bbjf-auth-badge">BBJF Member</span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.03em] text-slate-950">
            {t('signup.form.title')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t('signup.form.description')}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => switchMethod('email')}
            className={`rounded-xl px-3 py-3 text-sm font-black transition ${
              method === 'email'
                ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-950'
            }`}
            aria-pressed={method === 'email'}
          >
            {t('authPage.common.emailMethod')}
          </button>
          <button
            type="button"
            onClick={() => switchMethod('phone')}
            className={`rounded-xl px-3 py-3 text-sm font-black transition ${
              method === 'phone'
                ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-950'
            }`}
            aria-pressed={method === 'phone'}
          >
            {t('authPage.common.mobileOtp')}
          </button>
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
              className="bbjf-input"
              placeholder={t('signup.fullName.placeholder')}
              autoComplete="name"
            />
          </div>

          {method === 'email' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('authPage.common.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required={method === 'email'}
                className="bbjf-input"
                placeholder={t('login.email.placeholder')}
                autoComplete="email"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('authPage.common.mobileNumber')}
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required={method === 'phone'}
                className="bbjf-input"
                placeholder="03001234567"
                autoComplete="tel"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {t('authPage.common.phoneHint')}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('authPage.common.password')}
            </label>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              placeholder={t('signup.password.placeholder')}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('authPage.common.confirmPassword')}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
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
            className="bbjf-auth-button w-full disabled:opacity-60"
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

function normalizePakistanPhone(value: string) {
  const digits = value.replace(/\D/g, '')

  if (digits.startsWith('0092')) {
    return `+${digits.slice(2)}`
  }

  if (digits.startsWith('92')) {
    return `+${digits}`
  }

  if (digits.startsWith('0')) {
    return `+92${digits.slice(1)}`
  }

  if (digits.startsWith('3')) {
    return `+92${digits}`
  }

  return value.trim()
}

function isValidPakistanMobile(value: string) {
  return /^\+923\d{9}$/.test(value)
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

  if (lower.includes('phone') || lower.includes('sms')) {
    return t('signup.auth.phoneFailed')
  }

  if (lower.includes('email')) {
    return t('signup.auth.emailFailed')
  }

  return message
}
