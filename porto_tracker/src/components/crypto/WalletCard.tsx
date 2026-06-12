import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, ChevronDown, Copy, EyeOff, RefreshCw, Trash2 } from 'lucide-react'
import type { Holding, Wallet } from '../../lib/db'
import { db } from '../../lib/db'
import { chainById, chainOrder, EVM_CHAINS } from '../../lib/chains'
import { formatTokenAmount, formatUsd, truncateAddress } from '../../lib/formatters'
import { IconButton } from '../ui/Button'
import { useUi } from '../../store/ui'
import { refreshWallet } from '../../services/refresh'
import { usePortfolio } from '../../hooks/usePortfolio'

function SkeletonRows() {
  return (
    <div className="space-y-2 px-5 pb-5">
      {[80, 64, 72].map((w, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <div className="skeleton h-3.5" style={{ width: w }} />
          <div className="skeleton h-3.5 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Collapsible summary of tokens excluded from the total — airdrops, spam,
 * and unverified tokens. None of these count toward net worth; the price
 * shown is the explorer's/Jupiter's best guess and is for reference only.
 */
function HiddenRow({ walletId, hidden }: {
  walletId: string
  hidden: { count: number; valueUsd: number }
}) {
  const [open, setOpen] = useState(false)
  // load the actual unverified rows only when expanded
  const rows = useLiveQuery(
    async () =>
      open
        ? (await db.holdings.where('walletId').equals(walletId).toArray())
            .filter((h) => !h.verified)
            .sort((a, b) => b.amount * (b.priceUsd ?? 0) - a.amount * (a.priceUsd ?? 0))
        : [],
    [open, walletId],
  )

  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 px-5 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <EyeOff size={12} className="text-muted" />
        <span className="text-xs text-muted">
          {hidden.count} {hidden.count === 1 ? 'token' : 'tokens'} hidden as spam / unverified
        </span>
        <ChevronDown
          size={12}
          className={`ml-auto text-muted transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <>
          <p className="px-5 pb-2 text-[11px] leading-relaxed text-muted">
            Excluded from your total — airdrops and unrecognized tokens often report fake prices.
            Values here are unverified estimates.
          </p>
          <ul className="max-h-64 overflow-y-auto">
            {(rows ?? []).map((h) => (
              <li
                key={h.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-1.5 opacity-60"
              >
                <div className="min-w-0">
                  <span className="text-[13px] text-secondary">{h.symbol}</span>
                  <span className="ml-2 text-[11px] text-muted">{chainById(h.chainId)?.name}</span>
                </div>
                <span className="font-mono text-xs text-muted">
                  {formatTokenAmount(h.amount, h.symbol)}
                </span>
                <span className="w-24 text-right font-mono text-xs text-muted">
                  {h.priceUsd != null ? `~${formatUsd(h.amount * h.priceUsd)}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

const ROWS_SHOWN = 10

function ChainGroup({ chainId, holdings, holdingValueUsd }: {
  chainId: string
  holdings: Holding[]
  holdingValueUsd: (h: Holding) => number
}) {
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const chain = chainById(chainId)
  const sorted = [...holdings].sort((a, b) => holdingValueUsd(b) - holdingValueUsd(a))
  const visible = showAll ? sorted : sorted.slice(0, ROWS_SHOWN)
  const hidden = sorted.length - visible.length

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2 border-b border-white/5 px-5 py-2 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span className="size-1.5 rounded-full" style={{ background: chain?.color ?? '#52525B', boxShadow: `0 0 6px ${chain?.color ?? '#52525B'}50` }} />
        <span className="label-caps-xs">{chain?.name ?? chainId}</span>
        {holdings.length === 0 && <span className="text-[11px] text-muted">empty</span>}
        <ChevronDown
          size={12}
          className={`ml-auto text-muted transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && holdings.length > 0 && (
        <ul>
          {visible.map((h) => (
            <li
              key={h.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-2 transition-colors duration-150 hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <span className="text-sm text-primary">{h.symbol}</span>
                <span className="ml-2 hidden truncate text-xs text-muted sm:inline">{h.name}</span>
              </div>
              <span className="font-mono text-[13px] text-secondary">
                {formatTokenAmount(h.amount, h.symbol)}
              </span>
              <span className="w-28 text-right font-mono text-[13px] text-primary">
                {formatUsd(holdingValueUsd(h))}
              </span>
            </li>
          ))}
          {(hidden > 0 || showAll) && (
            <li>
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full cursor-pointer px-5 py-2 text-left text-xs text-muted transition-colors hover:bg-white/[0.03] hover:text-secondary"
              >
                {hidden > 0 ? `Show ${hidden} more` : 'Show less'}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function WalletCard({ wallet }: { wallet: Wallet }) {
  const { countedByWallet, hiddenByWallet, holdingValueUsd, settings } = usePortfolio()
  const refreshing = useUi((s) => s.refreshingWallets[wallet.id] ?? false)
  const [copied, setCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const mine = useMemo(
    () => countedByWallet.get(wallet.id) ?? [],
    [countedByWallet, wallet.id],
  )
  const hidden = hiddenByWallet.get(wallet.id) ?? { count: 0, valueUsd: 0 }

  const byChain = useMemo(() => {
    const map = new Map<string, Holding[]>()
    for (const h of mine) {
      const list = map.get(h.chainId) ?? []
      list.push(h)
      map.set(h.chainId, list)
    }
    // optionally surface scanned-but-empty chains
    if (settings.showEmptyChains && wallet.family === 'evm') {
      for (const c of EVM_CHAINS) {
        if (!map.has(c.id) && !wallet.failedChains.includes(c.id)) map.set(c.id, [])
      }
    }
    return [...map.entries()].sort((a, b) => chainOrder(a[0]) - chainOrder(b[0]))
  }, [mine, settings.showEmptyChains, wallet])

  const subtotal = mine.reduce((s, h) => s + holdingValueUsd(h), 0)
  const chainCount = new Set(mine.map((h) => h.chainId)).size
  const failedNames = wallet.failedChains
    .map((id) => chainById(id)?.name ?? id)
    .join(', ')

  const copy = async () => {
    await navigator.clipboard.writeText(wallet.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const remove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true)
      setTimeout(() => setConfirmRemove(false), 2500)
      return
    }
    await db.transaction('rw', db.wallets, db.holdings, async () => {
      await db.holdings.where('walletId').equals(wallet.id).delete()
      await db.wallets.delete(wallet.id)
    })
  }

  return (
    <div className="rounded-card glass-card overflow-hidden relative">
      {/* Left accent border */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-full bg-gradient-to-b from-accent/60 via-accent/20 to-transparent" />

      {/* header */}
      <div className="flex items-center gap-3 px-5 py-4 pl-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="truncate text-sm font-medium text-primary">{wallet.label}</span>
            {chainCount > 0 && (
              <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">
                {chainCount} {chainCount === 1 ? 'chain' : 'chains'}
              </span>
            )}
          </div>
          <button
            onClick={() => void copy()}
            className="group mt-0.5 flex cursor-pointer items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-secondary"
            title={wallet.address}
          >
            {truncateAddress(wallet.address)}
            {copied ? <Check size={11} className="text-accent" /> : <Copy size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />}
          </button>
        </div>

        <span className="ml-auto hidden font-mono text-sm text-primary sm:block">
          {formatUsd(subtotal)}
        </span>
        <IconButton
          onClick={() => void refreshWallet(wallet.id)}
          disabled={refreshing}
          aria-label={`Refresh ${wallet.label}`}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </IconButton>
        <IconButton
          onClick={() => void remove()}
          aria-label={confirmRemove ? 'Click again to confirm removal' : `Remove ${wallet.label}`}
          className={confirmRemove ? 'bg-danger/15 text-danger hover:bg-danger/20 hover:text-danger' : ''}
        >
          <Trash2 size={14} />
        </IconButton>
      </div>

      {/* body */}
      {refreshing && mine.length === 0 && hidden.count === 0 ? (
        <SkeletonRows />
      ) : mine.length === 0 && hidden.count === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-muted">
          {wallet.lastFetched
            ? 'No verified holdings found.'
            : 'Not scanned yet — hit refresh.'}
        </p>
      ) : (
        <div className="border-t border-white/5">
          {byChain.map(([chainId, hs]) => (
            <ChainGroup key={chainId} chainId={chainId} holdings={hs} holdingValueUsd={holdingValueUsd} />
          ))}
          {hidden.count > 0 && <HiddenRow walletId={wallet.id} hidden={hidden} />}
          <div className="flex items-center justify-end gap-4 border-t border-white/5 px-5 py-3">
            <span className="label-caps-xs">Wallet subtotal</span>
            <span className="font-mono text-sm font-medium text-primary">{formatUsd(subtotal)}</span>
          </div>
        </div>
      )}

      {failedNames && (
        <p className="border-t border-white/5 px-5 py-2.5 text-xs text-muted">
          Couldn't reach: {failedNames}
        </p>
      )}
    </div>
  )
}
