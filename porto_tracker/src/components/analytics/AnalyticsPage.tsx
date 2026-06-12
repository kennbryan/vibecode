import { BarChart3 } from 'lucide-react'
import { usePortfolio } from '../../hooks/usePortfolio'
import { byChain, rankWallets, topHoldings } from '../../lib/analytics'
import { chainById } from '../../lib/chains'
import { formatPct, formatUsd, truncateAddress } from '../../lib/formatters'
import { EmptyState } from '../ui/EmptyState'
import { CompactTotal } from '../CompactTotal'
import { useUi } from '../../store/ui'

function Card({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-card glass-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="label-caps-xs">{title}</p>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function AssetSplit() {
  const { allocation, totalUsd } = usePortfolio()
  return (
    <Card title="Asset classes">
      <div className="space-y-3">
        {allocation.map((a) => (
          <div key={a.key} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[13px] text-secondary">{a.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-accent/70"
                style={{ width: `${totalUsd > 0 ? a.pct : 0}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[12px] text-muted">
              {formatPct(a.pct)}
            </span>
            <span className="w-28 shrink-0 text-right font-mono text-[13px] text-primary">
              {formatUsd(a.usd)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function TopHoldings() {
  const { countedByWallet, cryptoUsd } = usePortfolio()
  const top = topHoldings(countedByWallet).slice(0, 10)
  if (top.length === 0)
    return (
      <Card title="Top holdings">
        <p className="text-[13px] text-muted">No crypto holdings yet.</p>
      </Card>
    )
  const max = top[0].usd || 1
  return (
    <Card title="Top holdings" hint="largest 10">
      <ul className="space-y-2.5">
        {top.map((h, i) => {
          const chain = chainById(h.chainId)
          return (
            <li key={h.id} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted">{i + 1}</span>
              <span className="size-2 shrink-0 rounded-full" style={{ background: chain?.color ?? '#52525b' }} />
              <span className="w-16 shrink-0 truncate text-[13px] text-primary">{h.symbol}</span>
              <span className="hidden w-20 shrink-0 truncate text-[11px] text-muted sm:block">{chain?.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(3, (h.usd / max) * 100)}%` }} />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted">
                {formatPct(cryptoUsd > 0 ? (h.usd / cryptoUsd) * 100 : 0)}
              </span>
              <span className="w-28 shrink-0 text-right font-mono text-[13px] text-primary">{formatUsd(h.usd)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function ByChain() {
  const { countedByWallet } = usePortfolio()
  const buckets = byChain(countedByWallet)
  if (buckets.length === 0)
    return (
      <Card title="By chain">
        <p className="text-[13px] text-muted">No crypto holdings yet.</p>
      </Card>
    )
  const max = buckets[0].usd || 1
  return (
    <Card title="Allocation by chain">
      <ul className="space-y-2.5">
        {buckets.map((b) => (
          <li key={b.chainId} className="flex items-center gap-3">
            <span className="size-2 shrink-0 rounded-full" style={{ background: b.color }} />
            <span className="w-24 shrink-0 truncate text-[13px] text-secondary">{b.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (b.usd / max) * 100)}%`, background: b.color }} />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-[12px] text-muted">{formatPct(b.pct)}</span>
            <span className="w-28 shrink-0 text-right font-mono text-[13px] text-primary">{formatUsd(b.usd)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function WalletsRanked() {
  const { wallets, countedByWallet, hiddenByWallet } = usePortfolio()
  const ranked = rankWallets(wallets, countedByWallet, hiddenByWallet).filter((r) => r.usd > 0)
  if (ranked.length === 0)
    return (
      <Card title="Wallets ranked">
        <p className="text-[13px] text-muted">No wallets with value yet.</p>
      </Card>
    )
  const max = ranked[0].usd || 1
  return (
    <Card title="Wallets ranked" hint={`${ranked.length}`}>
      <ul className="space-y-2.5">
        {ranked.map((r) => (
          <li key={r.wallet.id} className="flex items-center gap-3">
            <div className="w-28 shrink-0">
              <p className="truncate text-[13px] text-primary">{r.wallet.label}</p>
              <p className="font-mono text-[10px] text-muted">{truncateAddress(r.wallet.address)}</p>
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(3, (r.usd / max) * 100)}%` }} />
            </div>
            <span className="hidden w-20 shrink-0 text-right text-[11px] text-muted sm:block">
              {r.chainCount} {r.chainCount === 1 ? 'chain' : 'chains'}
            </span>
            <span className="w-28 shrink-0 text-right font-mono text-[13px] text-primary">{formatUsd(r.usd)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function AnalyticsPage() {
  const { totalUsd, wallets, stocks, cash } = usePortfolio()
  const setPage = useUi((s) => s.setPage)

  const isEmpty = totalUsd <= 0 && wallets.length === 0 && stocks.length === 0 && cash.length === 0

  return (
    <div className="pb-24">
      <CompactTotal title="Analytics" />
      {isEmpty ? (
        <div className="mt-10">
          <EmptyState
            icon={BarChart3}
            title="Nothing to analyze yet"
            body="Add wallets, stocks, or cash and refresh — Vault will break down your portfolio by holding, chain, and wallet."
            cta="Go to Holdings"
            onCta={() => setPage('holdings')}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <TopHoldings />
          <ByChain />
          <WalletsRanked />
          <AssetSplit />
        </div>
      )}
    </div>
  )
}
