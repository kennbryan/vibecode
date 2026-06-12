import type { CashAccount, Holding, Settings, Stock } from './db'

/**
 * Pure portfolio valuation — the single source of truth for "what is this
 * worth in USD". Shared by the render-time hook (usePortfolio) and the
 * service layer (snapshot capture on refresh) so a recorded snapshot total
 * always matches exactly what the dashboard shows.
 */

export const holdingValueUsd = (h: Holding): number => h.amount * (h.priceUsd ?? 0)

/** a holding counts only if verified, priced, and above the dust threshold */
export const isCounted = (h: Holding, dustThresholdUsd: number): boolean =>
  h.verified && h.priceUsd != null && holdingValueUsd(h) >= dustThresholdUsd

export const stockValueUsd = (st: Stock, fxRate: number | null): number => {
  if (st.priceNative == null) return 0
  const native = st.priceNative * st.shares
  if (st.currency === 'IDR') return fxRate ? native / fxRate : 0
  return native
}

export interface CashUsd {
  usd: number
  /** true when we fell back to 1:1 because no rate was set */
  assumed: boolean
}

export const cashValueUsd = (
  c: CashAccount,
  fxRate: number | null,
  crossRates: Record<string, number>,
): CashUsd => {
  if (c.currency === 'USD') return { usd: c.balance, assumed: false }
  if (c.currency === 'IDR') {
    return fxRate ? { usd: c.balance / fxRate, assumed: false } : { usd: 0, assumed: true }
  }
  const rate = crossRates[c.currency]
  if (rate && rate > 0) return { usd: c.balance / rate, assumed: false }
  return { usd: c.balance, assumed: true } // 1:1 with a visible warning
}

export interface Totals {
  cryptoUsd: number
  stocksUsd: number
  cashUsd: number
  totalUsd: number
}

/** compute every category total from raw rows + settings */
export function computeTotals(
  holdings: Holding[],
  stocks: Stock[],
  cash: CashAccount[],
  settings: Pick<Settings, 'fxRate' | 'dustThresholdUsd' | 'crossRates'>,
): Totals {
  const cryptoUsd = holdings
    .filter((h) => isCounted(h, settings.dustThresholdUsd))
    .reduce((sum, h) => sum + holdingValueUsd(h), 0)

  const stocksUsd = stocks.reduce((sum, st) => sum + stockValueUsd(st, settings.fxRate), 0)

  const cashUsd = cash.reduce(
    (sum, c) => sum + cashValueUsd(c, settings.fxRate, settings.crossRates).usd,
    0,
  )

  return { cryptoUsd, stocksUsd, cashUsd, totalUsd: cryptoUsd + stocksUsd + cashUsd }
}
