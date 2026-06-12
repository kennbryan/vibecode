import type { Stock } from '../lib/db'

/**
 * Stock quotes come from Yahoo Finance's public chart endpoint. Yahoo does
 * not send CORS headers, so requests are routed through a public CORS
 * proxy — the proxy only ever sees the ticker symbol, never any holding
 * amount. Manual price override is the always-reliable fallback.
 */

const TIMEOUT_MS = 15_000

const PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

interface YahooChart {
  chart: {
    result?: Array<{ meta: { regularMarketPrice?: number; currency?: string } }>
    error?: { description?: string } | null
  }
}

/** IDX tickers live on Yahoo with the `.JK` suffix (BBCA → BBCA.JK) */
export function yahooSymbol(stock: Pick<Stock, 'ticker' | 'exchange'>): string {
  const t = stock.ticker.toUpperCase().trim()
  return stock.exchange === 'IDX' && !t.endsWith('.JK') ? `${t}.JK` : t
}

export interface Quote {
  price: number
  currency: 'USD' | 'IDR'
}

export async function fetchQuote(stock: Pick<Stock, 'ticker' | 'exchange'>): Promise<Quote> {
  const symbol = yahooSymbol(stock)
  const target = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`

  let lastError: Error = new Error('quote unavailable')
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(target), { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = (await res.json()) as YahooChart
      const meta = json.chart.result?.[0]?.meta
      if (!meta?.regularMarketPrice) {
        throw new Error(json.chart.error?.description ?? `no quote for ${symbol}`)
      }
      return {
        price: meta.regularMarketPrice,
        currency: meta.currency === 'IDR' ? 'IDR' : 'USD',
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastError
}
