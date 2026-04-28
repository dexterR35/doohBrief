import { forwardRef, useId } from 'react'

const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    className = '',
    as: Component = 'input',
    id: providedId,
    type,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const resolvedId = providedId ?? generatedId
  const isTextarea = Component === 'textarea'
  const El = Component

  return (
    <div className="input-wrap">
      {label && <label htmlFor={resolvedId} className="input-label">{label}</label>}
      <El
        ref={ref}
        id={resolvedId}
        className={`input ${isTextarea ? 'min-h-[80px] py-2.5 h-auto' : ''} ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined}
        {...props}
        type={type}
      />
      {error && (
        <p id={`${resolvedId}-error`} className="input-error">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${resolvedId}-hint`} className="input-hint">
          {hint}
        </p>
      )}
    </div>
  )
})

export default Input
