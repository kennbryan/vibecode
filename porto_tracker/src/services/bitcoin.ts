import { BITCOIN_CHAIN } from '../lib/chains'
import { NATIVE_COINGECKO } from '../lib/tokenlist'
import { createLimiter, sleep } from '../lib/limiter'
import type { RawHolding } from './evm'

/**
 * Bitcoin balance via public explorers with failover. Any single explorer can
 * be slow or briefly unreachable (mempool.space in particular gets overloaded),
 * so we try several in order and only give up if all of them fail. Each
 * explorer returns a different shape, so each has its own balance parser.
 */

const TIMEOUT_MS = 20_000
const limit = createLimiter(3)

interface Explorer {
  name: string
  url: (addr: string) => string
  /** returns confirmed balance in satoshis */
  parse: (json: unknown) => number
}

interface EsploraAddress {
  chain_stats: { funded_txo_sum: number; spent_txo_sum: number }
  mempool_stats: { funded_txo_sum: number; spent_txo_sum: number }
}

const esploraSats = (json: unknown): number => {
  const a = json as EsploraAddress
  return (
    a.chain_stats.funded_txo_sum -
    a.chain_stats.spent_txo_sum +
    a.mempool_stats.funded_txo_sum -
    a.mempool_stats.spent_txo_sum
  )
}

// Order matters: reliable + correct shape first.
const EXPLORERS: Explorer[] = [
  {
    name: 'blockstream.info',
    url: (a) => `https://blockstream.info/api/address/${a}`,
    parse: esploraSats,
  },
  {
    name: 'mempool.space',
    url: (a) => `https://mempool.space/api/address/${a}`,
    parse: esploraSats,
  },
  {
    name: 'blockchain.info',
    url: (a) => `https://blockchain.info/rawaddr/${a}?limit=0`,
    parse: (json) => (json as { final_balance?: number }).final_balance ?? 0,
  },
]

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (res.status === 429 || res.status >= 500) throw new Error(`retryable ${res.status}`)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function fetchBalanceSats(address: string): Promise<number> {
  let lastErr: Error = new Error('bitcoin: all explorers failed')
  for (let i = 0; i < EXPLORERS.length; i++) {
    const ex = EXPLORERS[i]
    try {
      const json = await getJson(ex.url(address))
      return ex.parse(json)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      // brief backoff before falling through to the next explorer
      await sleep(300 + Math.random() * 300)
    }
  }
  throw lastErr
}

/** price fallback when the shared CoinGecko batch didn't include BTC */
async function fetchBtcPrice(): Promise<number | null> {
  try {
    const json = (await getJson('https://blockstream.info/api/v1/prices')) as Record<string, { USD?: number } | number>
    // blockstream returns a flat number under "BTC" or "USD" depending on path; guard both
    const usd = (json as { USD?: number }).USD
    if (typeof usd === 'number') return usd
  } catch {
    /* try mempool next */
  }
  try {
    const p = (await getJson('https://mempool.space/api/v1/prices')) as { USD?: number }
    return p.USD ?? null
  } catch {
    return null
  }
}

export async function fetchBitcoin(
  address: string,
  cgPrices: Record<string, number>,
): Promise<RawHolding[]> {
  return limit(async () => {
    const sats = await fetchBalanceSats(address)
    if (sats <= 0) return []

    const nativeId = NATIVE_COINGECKO[BITCOIN_CHAIN.id]
    let priceUsd = nativeId ? (cgPrices[nativeId] ?? null) : null
    if (priceUsd == null) priceUsd = await fetchBtcPrice()

    return [
      {
        chainId: BITCOIN_CHAIN.id,
        symbol: 'BTC',
        name: 'Bitcoin',
        contractAddress: null,
        amount: sats / 1e8,
        priceUsd,
        verified: true,
      },
    ]
  })
}
