import { SOLANA_CHAIN } from '../lib/chains'
import { NATIVE_COINGECKO, verifiedToken } from '../lib/tokenlist'
import { createLimiter } from '../lib/limiter'
import type { RawHolding } from './evm'

/**
 * Solana token discovery via Jupiter's keyless "Ultra balances" API.
 *
 * Public Solana JSON-RPC endpoints block `getTokenAccountsByOwner` from
 * browsers (403) — it's an expensive scan that free providers gate behind an
 * API key. Jupiter's balances endpoint is built for browser use: keyless,
 * CORS-enabled, and returns SOL + every SPL balance by mint in one call.
 */

const TIMEOUT_MS = 20_000
const SOL_MINT = 'So11111111111111111111111111111111111111112'

// One shared limiter so refreshing many wallets doesn't burst Jupiter.
const limit = createLimiter(3)

interface JupBalance {
  amount: string
  uiAmount: number
  isFrozen?: boolean
}
type JupBalances = Record<string, JupBalance>

interface JupPrice { usdPrice?: number }
interface JupToken { id: string; symbol?: string; name?: string }

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (res.status === 429 || res.status >= 500) throw new Error(`retryable ${res.status}`)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return (await res.json()) as T
}

/** mints we can label without a metadata lookup */
const KNOWN: Record<string, { symbol: string; name: string }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: 'USDC', name: 'USD Coin' },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: 'USDT', name: 'Tether USD' },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: 'JUP', name: 'Jupiter' },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: { symbol: 'mSOL', name: 'Marinade SOL' },
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: { symbol: 'jitoSOL', name: 'Jito SOL' },
}

async function jupPrices(mints: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (let i = 0; i < mints.length; i += 50) {
    const chunk = mints.slice(i, i + 50)
    try {
      const json = await getJson<Record<string, JupPrice>>(
        `https://lite-api.jup.ag/price/v3?ids=${chunk.join(',')}`,
      )
      for (const [mint, p] of Object.entries(json)) {
        if (typeof p?.usdPrice === 'number') out[mint] = p.usdPrice
      }
    } catch {
      /* prices optional */
    }
  }
  return out
}

async function jupMetadata(mints: string[]): Promise<Record<string, { symbol: string; name: string }>> {
  const out: Record<string, { symbol: string; name: string }> = {}
  if (mints.length === 0) return out
  try {
    const json = await getJson<JupToken[]>(
      `https://lite-api.jup.ag/tokens/v2/search?query=${mints.slice(0, 50).join(',')}`,
    )
    for (const t of json) {
      if (t.id) out[t.id] = { symbol: t.symbol ?? '???', name: t.name ?? 'Unknown token' }
    }
  } catch {
    /* metadata optional — fall back to truncated mint */
  }
  return out
}

export async function fetchSolana(
  address: string,
  cgPrices: Record<string, number>,
): Promise<RawHolding[]> {
  const holdings: RawHolding[] = []

  // keyless balances — SOL keyed as "SOL", SPL tokens keyed by mint
  const balances = await limit(() =>
    getJson<JupBalances>(`https://lite-api.jup.ag/ultra/v1/balances/${address}`),
  )

  const byMint = new Map<string, number>()
  let sol = 0
  for (const [key, bal] of Object.entries(balances)) {
    const amount = bal.uiAmount ?? 0
    if (amount <= 0) continue
    if (key === 'SOL') sol = amount
    else byMint.set(key, amount)
  }

  const mints = [...byMint.keys()]
  // Jupiter prices label/value unverified tokens in the hidden row only;
  // verified tokens are priced from CoinGecko.
  const jup = await jupPrices([SOL_MINT, ...mints])

  if (sol > 0) {
    const nativeId = NATIVE_COINGECKO[SOLANA_CHAIN.id]
    holdings.push({
      chainId: SOLANA_CHAIN.id,
      symbol: 'SOL',
      name: 'Solana',
      contractAddress: null,
      amount: sol,
      priceUsd: nativeId ? (cgPrices[nativeId] ?? null) : null,
      verified: true,
    })
  }

  // resolve metadata only for unknown tokens Jupiter prices (display only)
  const unknownPriced = mints.filter((m) => !KNOWN[m] && jup[m] !== undefined)
  const meta = await jupMetadata(unknownPriced)

  for (const [mint, amount] of byMint) {
    const verified = verifiedToken(SOLANA_CHAIN.id, mint.toLowerCase())
    const info = verified
      ? { symbol: verified.symbol ?? '???', name: KNOWN[mint]?.name ?? meta[mint]?.name ?? verified.symbol ?? 'Token' }
      : KNOWN[mint] ?? meta[mint] ?? {
          symbol: `${mint.slice(0, 4)}…${mint.slice(-4)}`,
          name: 'Unknown token',
        }
    holdings.push({
      chainId: SOLANA_CHAIN.id,
      symbol: info.symbol,
      name: info.name,
      contractAddress: mint,
      amount,
      // verified → CoinGecko price (counts); unverified → Jupiter price (display only)
      priceUsd: verified ? (cgPrices[verified.coingeckoId] ?? null) : (jup[mint] ?? null),
      verified: !!verified,
    })
  }

  return holdings
}
