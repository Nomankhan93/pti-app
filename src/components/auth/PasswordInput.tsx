import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { useI18n } from '../../lib/i18n'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  inputClassName?: string
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', inputClassName = '', ...props }, ref) => {
    const { t } = useI18n()
    const [isVisible, setIsVisible] = useState(false)
    const label = isVisible
      ? t('authPage.common.hidePassword')
      : t('authPage.common.showPassword')

    return (
      <div className={`bbjf-password-field ${className}`.trim()}>
        <input
          ref={ref}
          {...props}
          type={isVisible ? 'text' : 'password'}
          className={`bbjf-input bbjf-password-input ${inputClassName}`.trim()}
        />
        <button
          type="button"
          className="bbjf-password-toggle"
          onClick={() => setIsVisible((value) => !value)}
          aria-label={label}
          title={label}
        >
          {isVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
