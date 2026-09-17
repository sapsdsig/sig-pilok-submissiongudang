import type { ReactNode } from 'react'

interface BrandHeaderProps {
  title: string
  subtitle: string
  logoSrc?: string
  logoAlt?: string
  pilokLogoSrc?: string
  pilokLogoAlt?: string
}

export function BrandHeader({
  title,
  subtitle,
  logoSrc = '/branding/sig-logo-black.svg',
  logoAlt = 'Logo SIG',
  pilokLogoSrc = '/branding/pilok-logo-black.svg',
  pilokLogoAlt = 'Logo PILOK',
}: BrandHeaderProps) {
  return (
    <header className="brand-header">
      <div className="brand-header-inner">
        <div className="brand-logo-group">
          <img
            className="brand-logo brand-logo-sig"
            src={logoSrc}
            alt={logoAlt}
          />
          <span className="brand-logo-separator" aria-hidden="true" />
          <img
            className="brand-logo brand-logo-pilok"
            src={pilokLogoSrc}
            alt={pilokLogoAlt}
          />
        </div>
        <div className="brand-title-block">
          <p className="brand-eyebrow">PILOK · Form Operasional</p>
          <h1>{title}</h1>
          <p className="brand-subtitle">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}

interface FormShellProps extends BrandHeaderProps {
  children: ReactNode
}

export function FormShell({ children, ...header }: FormShellProps) {
  return (
    <div className="form-shell">
      <BrandHeader {...header} />
      <main className="form-container">{children}</main>
    </div>
  )
}

export function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`form-section ${className}`}>{children}</section>
}

export function SectionHeader({
  title,
  description,
  step,
}: {
  title: string
  description?: string
  step?: number
}) {
  return (
    <div className="section-heading">
      {step !== undefined && <span className="step-badge">{step}</span>}
      <div className="min-w-0">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  )
}

type StatusVariant = 'info' | 'success' | 'warning' | 'error'

export function StatusBanner({
  children,
  variant = 'info',
  title,
  compact = false,
}: {
  children: ReactNode
  variant?: StatusVariant
  title?: string
  compact?: boolean
}) {
  return (
    <div
      className={`status-banner status-banner-${variant} ${compact ? 'status-banner-compact' : ''}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className="status-indicator" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="status-title">{title}</p>}
        <div className="status-content">{children}</div>
      </div>
    </div>
  )
}

export function ActionBar({
  children,
  feedback,
}: {
  children: ReactNode
  feedback?: ReactNode
}) {
  return (
    <section className="action-bar">
      {feedback && <div className="min-w-0 flex-1">{feedback}</div>}
      <div className="action-bar-buttons">{children}</div>
    </section>
  )
}
