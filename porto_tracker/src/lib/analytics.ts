import type { Holding, Wallet } from './db'
import { chainById, chainOrder } from './chains'
import { holdingValueUsd } from './portfolioMath'

/**
 * Derivations for the Dashboard preview and Analytics page. All computed from
 * already-loaded portfolio data (countedByWallet) — no fetching.
 */

export interface RankedHolding {
  id: string
  symbol: string
  name: string
  chainId: string
  walletId: string
  usd: number
}

/** flatten counted holdings across all wallets, largest first */
export function topHoldings(countedByWallet: Map<string, Holding[]>): RankedHolding[] {
  const flat: RankedHolding[] = []
  for (const list of countedByWallet.values()) {
    for (const h of list) {
      flat.push({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        chainId: h.chainId,
        walletId: h.walletId,
        usd: holdingValueUsd(h),
      })
    }
  }
  return flat.sort((a, b) => b.usd - a.usd)
}

export interface ChainBucket {
  chainId: string
  name: string
  color: string
  usd: number
  pct: number
}

/** crypto value grouped by chain, largest first, with % of crypto total */
export function byChain(countedByWallet: Map<string, Holding[]>): ChainBucket[] {
  const sums = new Map<string, number>()
  for (const list of countedByWallet.values()) {
    for (const h of list) {
      sums.set(h.chainId, (sums.get(h.chainId) ?? 0) + holdingValueUsd(h))
    }
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0)
  return [...sums.entries()]
    .map(([chainId, usd]) => {
      const c = chainById(chainId)
      return {
        chainId,
        name: c?.name ?? chainId,
        color: c?.color ?? '#52525b',
        usd,
        pct: total > 0 ? (usd / total) * 100 : 0,
      }
    })
    .sort((a, b) => b.usd - a.usd)
}

export interface WalletRank {
  wallet: Wallet
  usd: number
  chainCount: number
  tokenCount: number
  hiddenCount: number
}

/** wallets ranked by counted USD subtotal */
export function rankWallets(
  wallets: Wallet[],
  countedByWallet: Map<string, Holding[]>,
  hiddenByWallet: Map<string, { count: number; valueUsd: number }>,
): WalletRank[] {
  return wallets
    .map((wallet) => {
      const list = countedByWallet.get(wallet.id) ?? []
      const usd = list.reduce((s, h) => s + holdingValueUsd(h), 0)
      const chainCount = new Set(list.map((h) => h.chainId)).size
      return {
        wallet,
        usd,
        chainCount,
        tokenCount: list.length,
        hiddenCount: hiddenByWallet.get(wallet.id)?.count ?? 0,
      }
    })
    .sort((a, b) => b.usd - a.usd)
}

export { chainOrder }
