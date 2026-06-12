import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, DEFAULT_SETTINGS, type Holding, type Settings, type Stock, type CashAccount, type Wallet } from '../lib/db'

export interface Portfolio {
  loaded: boolean
  settings: Settings
  wallets: Wallet[]
  holdings: Holding[]
  stocks: Stock[]
  cash: CashAccount[]

  /** verified holdings above dust, grouped per wallet — what the cards show */
  countedByWallet: Map<string, Holding[]>
  /** per wallet: tokens excluded as spam/unverified (count + summed display value) */
  hiddenByWallet: Map<string, { count: number; valueUsd: number }>

  cryptoUsd: number
  stocksUsd: number
  cashUsd: number
  totalUsd: number
  allocation: { key: 'crypto' | 'stocks' | 'cash'; label: string; usd: number; pct: number }[]

  /** IDR is always derived at render time from this */
  fxRate: number | null
  toIdr: (usd: number) => number | null
  stockValueUsd: (s: Stock) => number
  cashValueUsd: (c: CashAccount) => { usd: number; assumed: boolean }
  holdingValueUsd: (h: Holding) => number
}

export function usePortfolio(): Portfolio {
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const wallets = useLiveQuery(() => db.wallets.toArray(), [])
  const holdings = useLiveQuery(() => db.holdings.toArray(), [])
  const stocks = useLiveQuery(() => db.stocks.toArray(), [])
  const cash = useLiveQuery(() => db.cash.toArray(), [])

  return useMemo(() => {
    const s = settings ?? DEFAULT_SETTINGS
    const loaded =
      settings !== undefined || wallets !== undefined // first query resolution
    const fxRate = s.fxRate

    const holdingValueUsd = (h: Holding) => h.amount * (h.priceUsd ?? 0)
    const all = holdings ?? []

    // A holding counts only if it's verified (native or on the token list) AND
    // worth more than the dust threshold. Verified tokens with a null price are
    // dropped too — better to omit than to show a wrong number.
    const counted = all.filter(
      (h) => h.verified && h.priceUsd != null && holdingValueUsd(h) >= s.dustThresholdUsd,
    )

    // everything else, grouped per wallet for the collapsible "hidden" row
    const countedSet = new Set(counted.map((h) => h.id))
    const countedByWallet = new Map<string, Holding[]>()
    const hiddenByWallet = new Map<string, { count: number; valueUsd: number }>()
    for (const h of all) {
      if (countedSet.has(h.id)) {
        const list = countedByWallet.get(h.walletId) ?? []
        list.push(h)
        countedByWallet.set(h.walletId, list)
      } else {
        const cur = hiddenByWallet.get(h.walletId) ?? { count: 0, valueUsd: 0 }
        cur.count += 1
        cur.valueUsd += holdingValueUsd(h) // display-only price; never added to totals
        hiddenByWallet.set(h.walletId, cur)
      }
    }

    const cryptoUsd = counted.reduce((sum, h) => sum + holdingValueUsd(h), 0)

    const stockValueUsd = (st: Stock) => {
      if (st.priceNative == null) return 0
      const native = st.priceNative * st.shares
      if (st.currency === 'IDR') return fxRate ? native / fxRate : 0
      return native
    }
    const stocksUsd = (stocks ?? []).reduce((sum, st) => sum + stockValueUsd(st), 0)

    const cashValueUsd = (c: CashAccount): { usd: number; assumed: boolean } => {
      if (c.currency === 'USD') return { usd: c.balance, assumed: false }
      if (c.currency === 'IDR') {
        return fxRate ? { usd: c.balance / fxRate, assumed: false } : { usd: 0, assumed: true }
      }
      const rate = s.crossRates[c.currency]
      if (rate && rate > 0) return { usd: c.balance / rate, assumed: false }
      return { usd: c.balance, assumed: true } // 1:1 with a visible warning
    }
    const cashUsd = (cash ?? []).reduce((sum, c) => sum + cashValueUsd(c).usd, 0)

    const totalUsd = cryptoUsd + stocksUsd + cashUsd
    const pct = (v: number) => (totalUsd > 0 ? (v / totalUsd) * 100 : 0)

    return {
      loaded,
      settings: s,
      wallets: wallets ?? [],
      holdings: all,
      countedByWallet,
      hiddenByWallet,
      stocks: stocks ?? [],
      cash: cash ?? [],
      cryptoUsd,
      stocksUsd,
      cashUsd,
      totalUsd,
      allocation: [
        { key: 'crypto', label: 'Crypto', usd: cryptoUsd, pct: pct(cryptoUsd) },
        { key: 'stocks', label: 'Stocks', usd: stocksUsd, pct: pct(stocksUsd) },
        { key: 'cash', label: 'Cash', usd: cashUsd, pct: pct(cashUsd) },
      ],
      fxRate,
      toIdr: (usd: number) => (fxRate ? usd * fxRate : null),
      stockValueUsd,
      cashValueUsd,
      holdingValueUsd,
    }
  }, [settings, wallets, holdings, stocks, cash])
}
