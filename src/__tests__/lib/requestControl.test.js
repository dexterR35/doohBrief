import { describe, expect, it, vi } from 'vitest'
import { createDebouncedAsync, createMinIntervalGate } from '../../lib/requestControl'

describe('createDebouncedAsync', () => {
  it('runs only the latest call inside the debounce window', async () => {
    vi.useFakeTimers()
    const fn = vi.fn(async (value) => value)
    const debounced = createDebouncedAsync(fn, 200)

    const firstPromise = debounced('first')
    const firstHandled = firstPromise.catch((error) => error)
    const secondPromise = debounced('second')

    await vi.advanceTimersByTimeAsync(250)

    await expect(secondPromise).resolves.toBe('second')
    await expect(firstHandled).resolves.toBeInstanceOf(Error)
    await expect(firstPromise).rejects.toThrow('Debounced by newer call')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
    vi.useRealTimers()
  })
})

describe('createMinIntervalGate', () => {
  it('enforces a minimum spacing between calls', async () => {
    vi.useFakeTimers()
    const gate = createMinIntervalGate(300)

    const first = gate()
    await vi.advanceTimersByTimeAsync(1)
    await expect(first).resolves.toBeUndefined()

    const second = gate()
    let settled = false
    second.then(() => {
      settled = true
    })

    await vi.advanceTimersByTimeAsync(250)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(70)
    await expect(second).resolves.toBeUndefined()
    vi.useRealTimers()
  })
})
