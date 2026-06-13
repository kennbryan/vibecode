import { addSnapshot, db, getSettings, patchSettings, uid, type Wallet } from '../lib/db'
import { EVM_CHAINS } from '../lib/chains'
import { createLimiter } from '../lib/limiter'
import { computeTotals } from '../lib/portfolioMath'
import { fetchEvmChain, type RawHolding } from './evm'
import { fetchSolana } from './solana'
import { fetchBitcoin } from './bitcoin'
import { fetchQuote } from './stocks'
import { getPrices } from './prices'
import { useUi } from '../store/ui'

/** capture a net-worth snapshot from the current DB state (post-refresh) */
async function captureSnapshot(): Promise<void> {
  const [settings, holdings, stocks, cash] = await Promise.all([
    getSettings(),
    db.holdings.toArray(),
    db.stocks.toArray(),
    db.cash.toArray(),
  ])
  const { cryptoUsd, stocksUsd, cashUsd, totalUsd } = computeTotals(
    holdings,
    stocks,
    cash,
    settings,
  )
  // don't record an empty portfolio (e.g. first load before any data)
  if (totalUsd <= 0) return
  await addSnapshot({
    ts: Date.now(),
    totalUsd,
    cryptoUsd,
    stocksUsd,
    cashUsd,
    fxRate: settings.fxRate,
  })
}

// Cap how many wallets refresh at once. Each wallet fans out to ~11 chains, so
// without this 19 wallets would launch 200+ simultaneous requests and the
// public explorers/RPCs would throttle them all. 3 at a time keeps every
// endpoint under its rate limit while still finishing quickly.
const walletLimit = createLimiter(3)

/**
 * Refresh orchestrator. Every fetch is user-triggered (or auto-refresh-on-load
 * if the user enabled it). Failures degrade per chain — they never block the
 * UI or other chains.
 *
 * Prices are passed IN (fetched once, shared) — never fetched per wallet, or
 * CoinGecko's free tier 429s and every balance drops to $0.
 */

async function fetchWalletHoldings(
  wallet: Wallet,
  prices: Record<string, number>,
): Promise<{ holdings: RawHolding[]; failed: string[] }> {
  const holdings: RawHolding[] = []
  const failed: string[] = []

  if (wallet.family === 'evm') {
    const results = await Promise.allSettled(
      EVM_CHAINS.map((chain) => fetchEvmChain(chain, wallet.address, prices)),
    )
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') holdings.push(...r.value)
      else {
        failed.push(EVM_CHAINS[i].id)
        console.warn(`[vault] ${EVM_CHAINS[i].name} failed:`, r.reason)
      }
    })
  } else if (wallet.family === 'solana') {
    try {
      holdings.push(...(await fetchSolana(wallet.address, prices)))
    } catch (e) {
      failed.push('solana')
      console.warn('[vault] solana failed:', e)
    }
  } else if (wallet.family === 'bitcoin') {
    try {
      holdings.push(...(await fetchBitcoin(wallet.address, prices)))
    } catch (e) {
      failed.push('bitcoin')
      console.warn('[vault] bitcoin failed:', e)
    }
  }

  return { holdings, failed }
}

export async function refreshWallet(
  walletId: string,
  prices?: Record<string, number>,
): Promise<void> {
  const ui = useUi.getState()
  const wallet = await db.wallets.get(walletId)
  if (!wallet) return

  ui.setWalletRefreshing(walletId, true)
  try {
    // single-wallet refresh resolves prices from the shared cache (no 429)
    const px = prices ?? (await getPrices())
    const { holdings, failed } = await fetchWalletHoldings(wallet, px)
    const now = Date.now()
    const failedSet = new Set(failed)

    const prev = await db.holdings.where('walletId').equals(walletId).toArray()
    const prevPrice = new Map(
      prev.map((h) => [`${h.chainId}:${h.contractAddress ?? 'native'}`, h.priceUsd]),
    )

    // Preserve last-good prices: if a token came back without a price this time
    // (transient price gap), reuse the price from the existing row so a verified
    // holding never silently drops to $0.
    const fresh = holdings.map((h) => {
      if (h.verified && h.priceUsd == null) {
        const key = `${h.chainId}:${h.contractAddress ?? 'native'}`
        const last = prevPrice.get(key)
        if (last != null) return { ...h, priceUsd: last }
      }
      return h
    })

    // PER-CHAIN PRESERVATION: only the chains that succeeded get replaced.
    // For chains that failed (timeout/error this run), keep their PREVIOUS
    // holdings instead of wiping them — a transient failure on one chain must
    // never erase that chain's real balance. This is the fix for "some wallets
    // don't change / a balance disappears on refresh".
    const keptFromFailed = prev.filter((h) => failedSet.has(h.chainId))
    const next = [...fresh, ...keptFromFailed]

    await db.transaction('rw', db.holdings, db.wallets, async () => {
      await db.holdings.where('walletId').equals(walletId).delete()
      await db.holdings.bulkAdd(
        next.map((h) => ({
          chainId: h.chainId,
          symbol: h.symbol,
          name: h.name,
          contractAddress: h.contractAddress,
          amount: h.amount,
          priceUsd: h.priceUsd,
          verified: h.verified,
          id: uid(),
          walletId,
          lastFetched: now,
        })),
      )
      await db.wallets.update(walletId, { lastFetched: now, failedChains: failed })
    })
  } finally {
    useUi.getState().setWalletRefreshing(walletId, false)
  }
}

export async function refreshStocks(): Promise<void> {
  const ui = useUi.getState()
  const stocks = await db.stocks.toArray()
  const auto = stocks.filter((s) => !s.manualPrice)
  if (auto.length === 0) return

  ui.setStocksRefreshing(true)
  try {
    await Promise.allSettled(
      auto.map(async (s) => {
        const quote = await fetchQuote(s)
        await db.stocks.update(s.id, {
          priceNative: quote.price,
          currency: quote.currency,
          lastFetched: Date.now(),
        })
      }),
    )
  } finally {
    useUi.getState().setStocksRefreshing(false)
  }
}

export async function refreshAll(): Promise<void> {
  const ui = useUi.getState()
  if (ui.globalRefreshing) return
  ui.setGlobalRefreshing(true)
  try {
    const wallets = await db.wallets.toArray()
    // Fetch prices ONCE for the whole batch, then hand the same snapshot to
    // every wallet. This is the fix for "refresh all → everything $0": before,
    // each wallet fetched its own prices and CoinGecko 429'd after ~5 wallets.
    const prices = await getPrices(true)
    await Promise.allSettled([
      ...wallets.map((w) => walletLimit(() => refreshWallet(w.id, prices))),
      refreshStocks(),
    ])
    await patchSettings({ lastUpdated: Date.now() })
    // record net worth after all balances/prices have settled
    await captureSnapshot().catch((e) => console.warn('[vault] snapshot failed:', e))
  } finally {
    useUi.getState().setGlobalRefreshing(false)
  }
}
