import Dexie, { type EntityTable } from 'dexie'

/* ───────────────────────────── domain types ────────────────────────────── */

export type AddressFamily =
  | 'evm'
  | 'solana'
  | 'bitcoin'
  // detected but not yet supported — kept so the UI can explain, not hide
  | 'tron'
  | 'cosmos'
  | 'ton'
  | 'move' // sui / aptos (0x + 64 hex)

export interface Wallet {
  id: string
  address: string
  label: string
  family: AddressFamily
  createdAt: number
  lastFetched: number | null
  /** chain ids that errored on the last refresh */
  failedChains: string[]
}

export interface Holding {
  id: string
  walletId: string
  chainId: string
  symbol: string
  name: string
  /** null for native assets */
  contractAddress: string | null
  amount: number
  priceUsd: number | null
  /**
   * Whether this token counts toward the total. Native assets and tokens on
   * the verified list are true; everything else (airdrops, spam) is false and
   * shown only in the collapsible "hidden" row.
   */
  verified: boolean
  lastFetched: number
}

export type Exchange = 'US' | 'IDX'

export interface Stock {
  id: string
  ticker: string
  exchange: Exchange
  shares: number
  /** quote currency — IDX trades in IDR, US in USD */
  currency: 'USD' | 'IDR'
  priceNative: number | null
  manualPrice: boolean
  lastFetched: number | null
}

export interface CashAccount {
  id: string
  accountName: string
  currency: string
  balance: number
}

export interface Settings {
  key: 'app'
  /** user-defined USD/IDR rate — the single source for all IDR conversion */
  fxRate: number | null
  autoRefresh: boolean
  dustThresholdUsd: number
  showEmptyChains: boolean
  /** units of currency per 1 USD, e.g. { SGD: 1.35, EUR: 0.92 } */
  crossRates: Record<string, number>
  lastUpdated: number | null
}

/** a point-in-time net-worth record, captured on each refresh — powers History */
export interface Snapshot {
  id: string
  ts: number
  totalUsd: number
  cryptoUsd: number
  stocksUsd: number
  cashUsd: number
  /** stored so historical IDR values can be re-derived */
  fxRate: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  fxRate: null,
  autoRefresh: false,
  dustThresholdUsd: 1,
  showEmptyChains: false,
  crossRates: {},
  lastUpdated: null,
}

/* ─────────────────────────────── database ──────────────────────────────── */

export const db = new Dexie('vault') as Dexie & {
  wallets: EntityTable<Wallet, 'id'>
  holdings: EntityTable<Holding, 'id'>
  stocks: EntityTable<Stock, 'id'>
  cash: EntityTable<CashAccount, 'id'>
  settings: EntityTable<Settings, 'key'>
  snapshots: EntityTable<Snapshot, 'id'>
}

db.version(1).stores({
  wallets: 'id, address',
  holdings: 'id, walletId, chainId',
  stocks: 'id, ticker',
  cash: 'id',
  settings: 'key',
})

// v2: holdings gain a `verified` flag. Old rows are wiped — they'll be
// re-fetched on the next refresh with correct spam filtering, so there's
// nothing worth migrating (and keeping them would preserve bad totals).
db.version(2)
  .stores({
    wallets: 'id, address',
    holdings: 'id, walletId, chainId',
    stocks: 'id, ticker',
    cash: 'id',
    settings: 'key',
  })
  .upgrade((tx) => tx.table('holdings').clear())

// v3: net-worth snapshots for the History page. Purely additive — existing
// data is preserved (no upgrade callback needed).
db.version(3).stores({
  wallets: 'id, address',
  holdings: 'id, walletId, chainId',
  stocks: 'id, ticker',
  cash: 'id',
  settings: 'key',
  snapshots: 'id, ts',
})

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? DEFAULT_SETTINGS
}

export async function patchSettings(patch: Partial<Omit<Settings, 'key'>>) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, key: 'app' })
}

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

const SNAPSHOT_DEDUP_MS = 5 * 60_000

/**
 * Record a net-worth snapshot. To avoid spamming rows when the user mashes
 * refresh, if the most recent snapshot is < 5 minutes old we update it in
 * place rather than appending a new point.
 */
export async function addSnapshot(s: Omit<Snapshot, 'id'>): Promise<void> {
  const latest = await db.snapshots.orderBy('ts').last()
  if (latest && s.ts - latest.ts < SNAPSHOT_DEDUP_MS) {
    await db.snapshots.update(latest.id, { ...s, id: latest.id })
  } else {
    await db.snapshots.add({ ...s, id: uid() })
  }
}

/**
 * Ask the browser to mark our storage as persistent so it is never evicted
 * automatically under storage pressure. Without this, IndexedDB is "best
 * effort" and a browser low on disk may clear it. With it granted, data
 * survives until the user explicitly clears site data.
 *
 * Returns the resulting persistence state for display in Settings.
 */
export async function ensurePersistentStorage(): Promise<{
  persisted: boolean
  supported: boolean
}> {
  if (!('storage' in navigator) || !navigator.storage?.persist) {
    return { persisted: false, supported: false }
  }
  try {
    const already = await navigator.storage.persisted()
    const persisted = already || (await navigator.storage.persist())
    return { persisted, supported: true }
  } catch {
    return { persisted: false, supported: true }
  }
}

/** rough storage usage for the Settings panel */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  try {
    const e = await navigator.storage.estimate()
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
  } catch {
    return null
  }
}
