/**
 * formatters.ts — the ONLY place numbers are formatted.
 *
 * Rules (strict):
 *  - Always full numbers with thousands separators. Never abbreviate.
 *  - USD: 2 decimals, `$` prefix.
 *  - IDR: 0 decimals, `Rp ` prefix.
 *  - Crypto: stablecoins 2 decimals; BTC/ETH-style majors fixed 8 decimals
 *    with trailing zeros; everything else adaptive up to 8.
 *  - Shares: integer if whole, else up to 4 decimals.
 *  - Percentages: whole numbers, 1 decimal below 1%.
 */

const usd = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const idr = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const STABLECOINS = new Set([
  'USDC', 'USDT', 'USDT0', 'DAI', 'BUSD', 'FDUSD', 'TUSD', 'PYUSD', 'USDE',
  'USDS', 'GUSD', 'LUSD', 'CRVUSD', 'USDB', 'USDC.E', 'USDT.E', 'AXLUSDC',
])

const MAJORS = new Set([
  'BTC', 'WBTC', 'BTCB', 'TBTC', 'CBBTC', 'WBTC.E',
  'ETH', 'WETH', 'STETH', 'WSTETH', 'RETH', 'CBETH', 'WETH.E',
  'SOL', 'WSOL', 'MSOL', 'JITOSOL', 'BNB', 'WBNB', 'AVAX', 'WAVAX',
])

export function formatUsd(n: number): string {
  return `$${usd.format(n)}`
}

export function formatIdr(n: number): string {
  return `Rp ${idr.format(n)}`
}

export function formatTokenAmount(amount: number, symbol: string): string {
  const sym = symbol.toUpperCase()
  if (STABLECOINS.has(sym)) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  if (MAJORS.has(sym)) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    }).format(amount)
  }
  // adaptive: small balances get precision, large ones stay readable
  const maxFrac = amount !== 0 && Math.abs(amount) < 1 ? 8 : amount < 1000 ? 4 : 2
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFrac,
  }).format(amount)
}

export function formatShares(n: number): string {
  if (Number.isInteger(n)) return int.format(n)
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 4,
  }).format(n)
}

export function formatPct(p: number): string {
  if (p > 0 && p < 1) return `${p.toFixed(1)}%`
  return `${Math.round(p)}%`
}

/** FX-style rate: 18,300 or 1.35 */
export function formatRate(n: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: n >= 100 ? 0 : 4,
  }).format(n)
}

/** quote in its native currency — used by the stocks table */
export function formatNativePrice(n: number, currency: 'USD' | 'IDR'): string {
  return currency === 'IDR' ? formatIdr(n) : formatUsd(n)
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function timeAgo(ts: number | null): string {
  if (!ts) return 'never'
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/** convert a raw integer string + decimals into a JS number without float overflow */
export function fromUnits(value: string, decimals: number): number {
  try {
    const v = BigInt(value)
    const d = 10n ** BigInt(decimals)
    const whole = v / d
    const frac = v % d
    return Number(whole) + Number(frac) / Number(d)
  } catch {
    return Number(value) / 10 ** decimals
  }
}
