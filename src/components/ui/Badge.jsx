import { cn } from '../../utils/cn.js'

/**
 * Badge `variant` → `badge--*` modifier.
 * Prop names match `Button.jsx` so both accept the same `variant` values.
 */
export const BADGE_VARIANT_MODIFIER = {
  primary: 'default',
  secondary: 'slate',
  default: 'default',
  ghost: 'slate',
  outline: 'slate',
  gray: 'slate',
  link: 'info',
  danger: 'error',
  dangerMuted: 'error',
  red: 'error',
  sky: 'sky',
  success: 'success',
  emerald: 'emerald',
  amber: 'amber',
  warning: 'warning',
  error: 'error',
  info: 'info',
  slate: 'slate',
}

export const BADGE_VARIANT_KEYS = Object.freeze(Object.keys(BADGE_VARIANT_MODIFIER))

function modifierToBadgeClass(mod) {
  return mod === 'default' ? 'badge--default' : `badge--${mod}`
}

/** @param {string | undefined | null} variant */
export function resolveBadgeVariantKey(variant) {
  const v = variant == null || variant === '' ? 'default' : String(variant)
  if (v in BADGE_VARIANT_MODIFIER) return v
  return 'default'
}

/** @param {string | undefined | null} variant */
export function getBadgeModifier(variant) {
  const key = resolveBadgeVariantKey(variant)
  return BADGE_VARIANT_MODIFIER[key] ?? 'default'
}

/** Full class string for `<Badge />`. */
export function badgeCn(variant, className) {
  return cn('badge', modifierToBadgeClass(getBadgeModifier(variant)), className)
}

/** `variant` names match `Button`. */
export default function Badge({ variant = 'primary', className = '', children, as: As = 'span', ...rest }) {
  return (
    <As className={badgeCn(variant, className)} {...rest}>
      {children}
    </As>
  )
}
