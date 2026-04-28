import { useState, useCallback, useRef } from 'react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { sanitizeText } from '../utils/sanitize'
import { VALIDATION } from '../constants'

/**
 * Reusable confirm dialog hook.
 *
 * Usage:
 *   const { confirm, ConfirmModal } = useConfirm()
 *
 *   // Simple confirm:
 *   const ok = await confirm({ title: 'Delete?', message: '...', confirmLabel: 'Delete', variant: 'danger' })
 *
 *   // With text confirmation (user must type exact name to enable confirm):
 *   const ok = await confirm({ title: 'Deactivate?', message: '...', requireText: 'John Doe', requireTextLabel: 'Type the user name to confirm' })
 *
 *   // In JSX:
 *   {ConfirmModal}
 */
export function useConfirm() {
  const [state, setState] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [touched, setTouched] = useState(false)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current?.(false)
      resolveRef.current = resolve
      setTextInput('')
      setTouched(false)
      setState(options)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setTextInput('')
    setTouched(false)
    setState(null)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setTextInput('')
    setTouched(false)
    setState(null)
  }, [])

  // Sanitize + validate: exact match (case-sensitive)
  const sanitized = sanitizeText(textInput.trim())
  const required = state?.requireText?.trim() ?? ''
  const isExactMatch = required ? sanitized === required : true
  const isEmpty = required && sanitized.length === 0

  // Validation error message
  let inputError = null
  if (required && touched) {
    if (isEmpty) {
      inputError = 'This field is required'
    } else if (!isExactMatch) {
      inputError = 'Name does not match exactly'
    }
  }

  const handleInputChange = useCallback((e) => {
    const val = e.target.value
    if (val.length > VALIDATION.NAME_MAX) return
    setTextInput(val)
    if (!touched) setTouched(true)
  }, [touched])

  const ConfirmModal = (
    <Modal
      isOpen={!!state}
      onClose={handleCancel}
      title={state?.title ?? 'Confirm'}
      size="sm"
    >
      {state?.message && (
        <p className="text-sm text-ink-secondary mb-4">{state.message}</p>
      )}
      {required && (
        <div className="mb-5">
          <Input
            label={state.requireTextLabel ?? `Type "${required}" to confirm`}
            value={textInput}
            onChange={handleInputChange}
            onBlur={() => setTouched(true)}
            placeholder={required}
            maxLength={VALIDATION.NAME_MAX}
            error={inputError}
            autoFocus
          />
          {touched && isExactMatch && !isEmpty && (
            <p className="text-xs text-emerald-600 mt-1">Name matches</p>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          variant={state?.variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          disabled={!isExactMatch || isEmpty}
        >
          {state?.confirmLabel ?? 'Confirm'}
        </Button>
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </Modal>
  )

  return { confirm, ConfirmModal }
}
