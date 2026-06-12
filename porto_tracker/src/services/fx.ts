/**
 * FX suggestion — fetches the current ECB reference rate from Frankfurter
 * (free, no key, CORS-enabled). The user must confirm before it's applied;
 * the app never auto-fetches FX.
 */
export async function fetchSuggestedRate(to = 'IDR'): Promise<number> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${to}`, {
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`fx ${res.status}`)
  const json = (await res.json()) as { rates?: Record<string, number> }
  const rate = json.rates?.[to]
  if (!rate) throw new Error('rate unavailable')
  return rate
}
