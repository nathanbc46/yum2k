const DEFAULT_TIMEOUT_MS = 30_000

export function withTimeout<T>(promise: PromiseLike<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
    )
  ])
}
