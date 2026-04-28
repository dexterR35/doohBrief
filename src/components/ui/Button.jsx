import { cn } from '../../utils/cn.js'

/**
 * Button `variant` → CSS classes (`btn-*`, `btn-tone--*`).
 * Prop names match `Badge.jsx` so both accept the same `variant` values.
 */
export const BUTTON_VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  default: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  dangerMuted: 'btn-danger-muted',
  red: 'btn-danger',
  outline: 'btn-outline',
  gray: 'btn-gray',
  link: 'btn-link',
  sky: 'btn-tone btn-tone--sky',
  success: 'btn-tone btn-tone--success',
  emerald: 'btn-tone btn-tone--emerald',
  amber: 'btn-tone btn-tone--amber',
  warning: 'btn-tone btn-tone--warning',
  error: 'btn-tone btn-tone--error',
  info: 'btn-tone btn-tone--info',
  slate: 'btn-tone btn-tone--slate',
}

export const BUTTON_VARIANT_KEYS = Object.freeze(Object.keys(BUTTON_VARIANT_CLASS))

/** @param {string | undefined | null} variant */
export function resolveButtonVariantKey(variant) {
  const v = variant == null || variant === '' ? 'primary' : String(variant)
  if (v in BUTTON_VARIANT_CLASS) return v
  return 'primary'
}

/** @param {string | undefined | null} variant */
export function getButtonClasses(variant) {
  const key = resolveButtonVariantKey(variant)
  return BUTTON_VARIANT_CLASS[key] ?? BUTTON_VARIANT_CLASS.primary
}

/** Reusable button sizes. */
export const BUTTON_SIZES = {
  xs: 'btn-sm',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
  xl: 'btn-lg',
}

/**
 * Reusable, dynamic Button component. Use everywhere for consistent styling.
 *
 * @param {string} variant - Visual style (same names as `Badge`).
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size - Size (default: md)
 * @param {boolean} fullWidth - Stretch to container width
 * @param {boolean} loading - Show spinner and disable
 * @param {React.ComponentType} icon - Heroicon (or other) component for icon
 * @param {'left'|'right'} iconPosition - Icon before or after children
 * @param {'center'|'start'} contentAlign - Inner row alignment (default center; use start for full-width menu rows)
 * @param {React.ElementType} as - Render as (e.g. 'button', 'a') for polymorphism
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  loading,
  icon: Icon,
  iconPosition = 'left',
  contentAlign = 'center',
  as: Component = 'button',
  ...props
}) {
  const variantClass = getButtonClasses(variant)
  const sizeClass = BUTTON_SIZES[size] ?? ''
  const innerGap =
    size === 'lg' || size === 'xl' ? 'gap-2.5' : size === 'sm' || size === 'xs' ? 'gap-1.5' : 'gap-2'
  const iconClass =
    size === 'lg' || size === 'xl'
      ? 'h-5 w-5 shrink-0'
      : size === 'sm' || size === 'xs'
        ? 'h-3.5 w-3.5 shrink-0'
        : 'h-4 w-4 shrink-0'

  const classes = cn(
    variantClass,
    sizeClass,
    fullWidth && 'w-full',
    'relative cursor-pointer disabled:cursor-not-allowed',
    className
  )

  return (
    <Component
      className={classes}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center',
          (fullWidth || contentAlign === 'start') && 'w-full',
          contentAlign === 'start' ? 'justify-start' : 'justify-center',
          innerGap,
          loading && 'opacity-0'
        )}
      >
        {Icon && iconPosition === 'left' && <Icon className={iconClass} aria-hidden />}
        {children}
        {Icon && iconPosition === 'right' && <Icon className={iconClass} aria-hidden />}
      </span>
    </Component>
  )
}
