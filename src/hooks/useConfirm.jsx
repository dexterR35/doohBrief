import { useState, useCallback, useRef } from 'react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export function useConfirm() {
  const [state, setState] = useState(null)
  const [textInput, setTextInput] = useState('')
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current?.(false)
      resolveRef.current = resolve
      setTextInput('')
      setState(options)
    })
  }, [])

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true)
    resolveRef.current = null
    setTextInput('')
    setState(null)
  }, [])

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false)
    resolveRef.current = null
    setTextInput('')
    setState(null)
  }, [])

  const required = state?.requireText?.trim() ?? ''
  const normalizedInput = textInput
    .trim()
    // Allow users to paste/type quoted confirmation text from the prompt.
    .replace(/^["'`“”](.*)["'`“”]$/, '$1')
    .trim()
  const isExactMatch = required ? normalizedInput === required : true

  const ConfirmModal = (
    <Modal isOpen={!!state} onClose={handleCancel} title={state?.title ?? 'Confirm'} size="sm">
      {state?.message && <p className="text-sm text-ink-secondary mb-4">{state.message}</p>}
      {required && (
        <div className="mb-5">
          <Input
            label={state.requireTextLabel ?? `Type "${required}" to confirm`}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={required}
            autoFocus
          />
        </div>
      )}
      <div className="flex gap-2">
        <Button variant={state?.variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} disabled={!isExactMatch}>
          {state?.confirmLabel ?? 'Confirm'}
        </Button>
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
      </div>
    </Modal>
  )

  return { confirm, ConfirmModal }
}
