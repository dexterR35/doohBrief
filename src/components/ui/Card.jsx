import { cn } from '../../utils/cn.js'

/**
 * Solid card shell (no glass). padding: none | sm | md
 */
export function Card({ children, padding = 'md', className = '', ...props }) {
  const noPadding = padding === 'none' || padding === false
  return (
    <div
      className={cn(
        'card',
        noPadding && 'card--no-padding-none',
        !noPadding && padding === 'sm' && 'p-4',
        !noPadding && (padding === 'md' || padding === true) && 'card--padded',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, className = '', ...props }) {
  return (
    <div className={cn('card-header', className)} {...props}>
      <div>
        {title && <h3 className="card-header__title">{title}</h3>}
        {subtitle && <p className="card-header__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '', ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
