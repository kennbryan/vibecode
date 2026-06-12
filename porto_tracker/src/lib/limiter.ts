/**
 * A tiny promise queue that caps how many tasks run at once. Public RPC
 * endpoints (especially Solana's) rate-limit aggressively, so when many
 * wallets refresh together we funnel their calls through one of these instead
 * of firing a thundering herd that all gets 429'd.
 */
export function createLimiter(concurrency: number) {
  let active = 0
  const queue: (() => void)[] = []

  const next = () => {
    if (active >= concurrency) return
    const run = queue.shift()
    if (!run) return
    active++
    run()
  }

  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--
            next()
          })
      }
      queue.push(run)
      next()
    })
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
