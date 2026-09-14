import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { PasswordInput } from '../components/auth/PasswordInput'
import { PASSWORD_MIN_LENGTH, validatePasswordPolicy } from '../lib/auth/password-policy'
import { useI18n, type TranslationKey } from '../lib/i18n'
import { supabase } from '../lib/supabase/client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type AuthMode = 'login' | 'forgot' | 'reset'

function LoginPage() {
  const navigate = useNavigate()
  const { t, direction } = useI18n()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('recovery') === '1') {
      setMode('reset')
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
        setError('')
        setMessage('')
      }
    })

    return () => data.subscription.unsubscribe()
  }, [])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError(t('login.error.invalidEmail'))
      return
    }

    if (!password.trim()) {
      setError(t('login.error.passwordRequired'))
      return
    }

    setLoading(true)
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    setLoading(false)

    if (loginError) {
      setError(toFriendlyLoginError(loginError.message, t))
      return
    }

    await navigate({ to: '/dashboard', replace: true })
  }

  async function handleForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError(t('login.error.invalidEmail'))
      return
    }

    setLoading(true)
    const redirectTo = typeof window === 'undefined'
      ? undefined
      : `${window.location.origin}/login?recovery=1`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    })
    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setMessage(t('login.recovery.sent'))
  }

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

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
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setMessage(t('login.recovery.updated'))
    window.setTimeout(() => {
      void navigate({ to: '/dashboard', replace: true })
    }, 800)
  }

  return (
    <main className="pti-auth-page px-4 py-12" dir={direction}>
      <div className="pti-auth-card mx-auto max-w-md p-7 md:p-8">
        <div className="mb-7 text-center">
          <span className="pti-auth-badge">PTI Access</span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.03em] text-slate-950">
            {mode === 'forgot'
              ? t('login.recovery.title')
              : mode === 'reset'
                ? t('login.recovery.resetTitle')
                : t('login.form.title')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {mode === 'forgot'
              ? t('login.recovery.description')
              : mode === 'reset'
                ? t('login.recovery.resetDescription')
                : t('login.hero.description')}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <EmailField value={email} onChange={setEmail} label={t('authPage.common.email')} placeholder={t('login.email.placeholder')} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t('authPage.common.password')}
              </label>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder={t('login.password.placeholder')}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => changeMode('forgot')}
                className="mt-2 text-xs font-black text-emerald-800 hover:underline"
              >
                {t('login.recovery.forgot')}
              </button>
            </div>
            <Alert error={error} message={message} />
            <button type="submit" disabled={loading} className="pti-auth-button w-full disabled:opacity-60">
              {loading ? t('login.submit.loading') : t('auth.login')}
            </button>
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={handleForgot} className="space-y-5">
            <EmailField value={email} onChange={setEmail} label={t('authPage.common.email')} placeholder={t('login.email.placeholder')} />
            <Alert error={error} message={message} />
            <button type="submit" disabled={loading} className="pti-auth-button w-full disabled:opacity-60">
              {loading ? t('login.recovery.sending') : t('login.recovery.send')}
            </button>
            <button type="button" onClick={() => changeMode('login')} className="w-full text-sm font-black text-emerald-800 hover:underline">
              {t('login.recovery.back')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('login.recovery.newPassword')}</label>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={t('signup.password.placeholder')}
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">{t('signup.password.policy')}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('authPage.common.confirmPassword')}</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={t('signup.confirmPassword.placeholder')}
              />
            </div>
            <Alert error={error} message={message} />
            <button type="submit" disabled={loading} className="pti-auth-button w-full disabled:opacity-60">
              {loading ? t('login.recovery.updating') : t('login.recovery.update')}
            </button>
          </form>
        )}

        {mode === 'login' ? (
          <p className="mt-5 text-center text-sm text-slate-600">
            {t('login.noAccount')}{' '}
            <Link to="/signup" className="font-bold text-emerald-700">
              {t('login.needAccount.cta')}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  )
}

function EmailField({ value, onChange, label, placeholder }: { value: string; onChange: (value: string) => void; label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="pti-input"
        placeholder={placeholder}
        autoComplete="email"
      />
    </div>
  )
}

function Alert({ error, message }: { error: string; message: string }) {
  if (error) return <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>
  if (message) return <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p>
  return null
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function toFriendlyLoginError(message: string, t: (key: TranslationKey) => string) {
  const lower = message.toLowerCase()

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return t('login.auth.invalidCredentials')
  }

  if (lower.includes('confirm') && lower.includes('email')) {
    return t('login.auth.emailNotConfirmed')
  }

  return message
}
