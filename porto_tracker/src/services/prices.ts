import { allCoingeckoIds } from '../lib/tokenlist'
import { EVM_CHAINS } from '../lib/chains'
import { fetchCoingeckoPrices, rpcPriceIds } from './evm'

/**
 * Shared price cache. CoinGecko's free tier rate-limits after ~5 rapid calls,
 * so we must NEVER fetch prices per-wallet — "Refresh all" with several wallets
 * would 429 and null out every price, dropping all balances to $0.
 *
 * Instead, prices are fetched once and cached. Every wallet refresh in a batch
 * reuses the same snapshot. The cache also survives long enough that refreshing
 * one wallet, then another, doesn't re-hit the API.
 */

const TTL_MS = 60_000

let cache: Record<string, number> = {}
let cachedAt = 0
let inflight: Promise<Record<string, number>> | null = null

const ALL_IDS = [...new Set([...allCoingeckoIds(), ...rpcPriceIds(EVM_CHAINS)])]

/**
 * Get USD prices for every token id the app knows about. Returns the cached
 * snapshot when fresh; otherwise fetches once (deduping concurrent callers).
 *
 * Crucially: if a fetch fails or comes back partial, we KEEP the previous
 * snapshot rather than returning an empty map — a transient 429 must not zero
 * out the whole portfolio. Pass `force` to bypass the TTL (manual refresh).
 */
export async function getPrices(force = false): Promise<Record<string, number>> {
  const fresh = Date.now() - cachedAt < TTL_MS
  if (!force && fresh && Object.keys(cache).length > 0) return cache
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const next = await fetchCoingeckoPrices(ALL_IDS)
      if (Object.keys(next).length > 0) {
        // merge over the old snapshot so a partial response never loses prices
        cache = { ...cache, ...next }
        cachedAt = Date.now()
      }
      return cache
    } catch {
      // keep whatever we had — better a slightly stale price than $0
      return cache
    } finally {
      inflight = null
    }
  })()

  return inflight
}

/** for tests / wipe */
export function clearPriceCache() {
  cache = {}
  cachedAt = 0
  inflight = null
}
