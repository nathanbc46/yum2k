import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Inline the function since auto-import doesn't work in tests
function withTimeout<T>(promise: PromiseLike<T>, ms = 30_000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    ),
  ])
}

describe('withTimeout', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('resolves when promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 1000)
    expect(result).toBe('ok')
  })

  it('rejects with timeout error when promise takes too long', async () => {
    const slow = new Promise<string>(resolve => setTimeout(() => resolve('late'), 5000))
    const racePromise = withTimeout(slow, 1000)
    vi.advanceTimersByTime(1001)
    await expect(racePromise).rejects.toThrow('Request timeout after 1000ms')
  })

  it('rejects immediately if promise rejects before timeout', async () => {
    const failing = Promise.reject(new Error('api error'))
    await expect(withTimeout(failing, 5000)).rejects.toThrow('api error')
  })
})
