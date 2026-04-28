/**
 * Debounce an async function and only execute the latest call in a burst.
 * Older pending calls are rejected so callers can ignore stale intents.
 */
export function createDebouncedAsync(fn, waitMs = 250) {
  let timer = null
  let pendingReject = null

  return (...args) =>
    new Promise((resolve, reject) => {
      if (timer) {
        clearTimeout(timer)
        if (pendingReject) pendingReject(new Error('Debounced by newer call'))
      }
      pendingReject = reject

      timer = setTimeout(async () => {
        try {
          resolve(await fn(...args))
        } catch (error) {
          reject(error)
        } finally {
          timer = null
          pendingReject = null
        }
      }, Math.max(0, Number(waitMs) || 0))
    })
}

/**
 * Creates an async gate that guarantees a minimum interval between executions.
 */
export function createMinIntervalGate(minIntervalMs = 300) {
  let nextAllowedAt = 0

  return async () => {
    const now = Date.now()
    const delayMs = Math.max(0, nextAllowedAt - now)
    if (delayMs > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, delayMs)
      })
    }
    nextAllowedAt = Date.now() + Math.max(0, Number(minIntervalMs) || 0)
  }
}
