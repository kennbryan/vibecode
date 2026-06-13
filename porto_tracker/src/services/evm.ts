import type { ChainConfig, CuratedToken } from '../lib/chains'
import { fromUnits } from '../lib/formatters'
import { NATIVE_COINGECKO, verifiedToken } from '../lib/tokenlist'

export interface RawHolding {
  chainId: string
  symbol: string
  name: string
  contractAddress: string | null
  amount: number
  priceUsd: number | null
  /** counts toward the total — native assets + verified tokens only */
  verified: boolean
}

const TIMEOUT_MS = 20_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  // retry on rate-limit / transient server errors with jittered backoff;
  // 404 and other client errors are surfaced immediately (callers handle 404)
  let lastErr: Error = new Error(`failed ${url}`)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (res.status === 429 || res.status >= 500) throw new Error(`retryable ${res.status} ${url}`)
      if (!res.ok) throw new Error(`${res.status} ${url}`)
      return (await res.json()) as T
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
      // timeouts surface as TimeoutError or AbortError depending on the engine
      const retryable =
        lastErr.message.startsWith('retryable') ||
        lastErr.name === 'TimeoutError' ||
        lastErr.name === 'AbortError'
      if (!retryable || attempt === 2) throw lastErr
      await sleep(500 * (attempt + 1) + Math.random() * 400)
    }
  }
  throw lastErr
}

/* ─────────────────────────── Blockscout provider ───────────────────────── */

interface BsAddress { coin_balance: string | null }
interface BsTokenBalance {
  value: string
  token: {
    type: string
    symbol: string | null
    name: string | null
    decimals: string | null
    address?: string
    address_hash?: string
  }
}

async function fetchBlockscout(
  chain: ChainConfig,
  baseUrl: string,
  address: string,
  prices: Record<string, number>,
): Promise<RawHolding[]> {
  const holdings: RawHolding[] = []

  // native balance (404 = address never seen on this chain → zero)
  const addrInfo = await getJson<BsAddress>(`${baseUrl}/api/v2/addresses/${address}`).catch(
    (e: Error) => {
      if (e.message.startsWith('404')) return null
      throw e
    },
  )

  if (addrInfo?.coin_balance && addrInfo.coin_balance !== '0') {
    const amount = fromUnits(addrInfo.coin_balance, chain.nativeDecimals)
    const nativeId = NATIVE_COINGECKO[chain.id]
    holdings.push({
      chainId: chain.id,
      symbol: chain.nativeSymbol,
      name: chain.nativeName,
      contractAddress: null,
      amount,
      priceUsd: nativeId ? (prices[nativeId] ?? null) : null,
      verified: true, // native always counts
    })
  }

  const tokens = await getJson<BsTokenBalance[]>(
    `${baseUrl}/api/v2/addresses/${address}/token-balances`,
  ).catch((e: Error) => {
    if (e.message.startsWith('404')) return [] as BsTokenBalance[]
    throw e
  })

  for (const tb of tokens) {
    // some explorer rows have a null token object — skip defensively
    if (!tb.token) continue
    // fungible only — NFTs (ERC-721/1155) are out of scope
    if (tb.token.type !== 'ERC-20') continue
    const decimals = Number(tb.token.decimals ?? '18')
    if (!Number.isFinite(decimals)) continue
    const amount = fromUnits(tb.value, decimals)
    if (amount <= 0) continue

    const contract = tb.token.address_hash ?? tb.token.address ?? null
    const verified = verifiedToken(chain.id, contract)

    holdings.push({
      chainId: chain.id,
      // prefer our canonical symbol over whatever the explorer returns
      symbol: verified?.symbol ?? tb.token.symbol ?? '???',
      name: tb.token.name ?? 'Unknown token',
      contractAddress: contract,
      amount,
      // price ONLY from CoinGecko — the explorer's exchange_rate is fabricated
      // for spam tokens and is never trusted here.
      priceUsd: verified ? (prices[verified.coingeckoId] ?? null) : null,
      verified: !!verified,
    })
  }

  return holdings
}

/* ──────────────────── RPC provider (BNB / Avalanche / OP / …) ───────────── */

let rpcId = 1
async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const body = { jsonrpc: '2.0', id: rpcId++, method, params }
  const json = await getJson<{ result?: T; error?: { message: string } }>(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (json.error) throw new Error(json.error.message)
  return json.result as T
}

async function erc20BalanceOf(rpcUrl: string, token: CuratedToken, owner: string): Promise<number> {
  const data = '0x70a08231' + owner.toLowerCase().replace('0x', '').padStart(64, '0')
  const hex = await rpcCall<string>(rpcUrl, 'eth_call', [{ to: token.address, data }, 'latest'])
  if (!hex || hex === '0x') return 0
  return fromUnits(BigInt(hex).toString(), token.decimals)
}

/** batched CoinGecko id pricing — one keyless call covers everything */
export async function fetchCoingeckoPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {}
  const unique = [...new Set(ids)]
  const json = await getJson<Record<string, { usd?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${unique.join(',')}&vs_currencies=usd`,
  )
  const out: Record<string, number> = {}
  for (const [id, v] of Object.entries(json)) {
    if (typeof v.usd === 'number') out[id] = v.usd
  }
  return out
}

async function fetchRpcChain(
  chain: ChainConfig,
  provider: { rpcUrl: string; nativeCoingeckoId: string; tokens: CuratedToken[] },
  address: string,
  prices: Record<string, number>,
): Promise<RawHolding[]> {
  const holdings: RawHolding[] = []

  const balHex = await rpcCall<string>(provider.rpcUrl, 'eth_getBalance', [address, 'latest'])
  const native = fromUnits(BigInt(balHex).toString(), chain.nativeDecimals)
  if (native > 0) {
    holdings.push({
      chainId: chain.id,
      symbol: chain.nativeSymbol,
      name: chain.nativeName,
      contractAddress: null,
      amount: native,
      priceUsd: prices[provider.nativeCoingeckoId] ?? null,
      verified: true,
    })
  }

  // the curated token list IS the verified set for rpc chains
  const results = await Promise.allSettled(
    provider.tokens.map(async (t) => ({ token: t, amount: await erc20BalanceOf(provider.rpcUrl, t, address) })),
  )
  for (const r of results) {
    if (r.status !== 'fulfilled' || r.value.amount <= 0) continue
    const { token, amount } = r.value
    holdings.push({
      chainId: chain.id,
      symbol: token.symbol,
      name: token.name,
      contractAddress: token.address,
      amount,
      priceUsd: prices[token.coingeckoId] ?? null,
      verified: true,
    })
  }

  return holdings
}

/* ────────────────────────────── entry point ────────────────────────────── */

export async function fetchEvmChain(
  chain: ChainConfig,
  address: string,
  prices: Record<string, number>,
): Promise<RawHolding[]> {
  if (!chain.provider) return []
  if (chain.provider.kind === 'blockscout') {
    return fetchBlockscout(chain, chain.provider.baseUrl, address, prices)
  }
  return fetchRpcChain(chain, chain.provider, address, prices)
}

/** coingecko ids needed by rpc-provider chains (native + curated tokens) */
export function rpcPriceIds(chains: ChainConfig[]): string[] {
  const ids: string[] = []
  for (const c of chains) {
    if (c.provider?.kind === 'rpc') {
      ids.push(c.provider.nativeCoingeckoId, ...c.provider.tokens.map((t) => t.coingeckoId))
    }
  }
  return ids
}
