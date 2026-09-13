import { Link } from '@tanstack/react-router'

export const PTI_LOGO_PATH = '/brand/pti-logo.svg'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="pti-brand-mark group no-underline" aria-label="Pakistan Tehreek-e-Insaf home">
      <span className={compact ? 'pti-brand-logo is-compact' : 'pti-brand-logo'}>
        <img src={PTI_LOGO_PATH} alt="Pakistan Tehreek-e-Insaf logo" />
      </span>
      <span className="min-w-0">
        <span className="pti-brand-name">Pakistan Tehreek-e-Insaf</span>
        <span className="pti-brand-platform">Digital Operations Platform</span>
      </span>
    </Link>
  )
}
