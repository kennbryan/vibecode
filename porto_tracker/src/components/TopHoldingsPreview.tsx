import { ArrowRight } from 'lucide-react'
import { usePortfolio } from '../hooks/usePortfolio'
import { topHoldings } from '../lib/analytics'
import { chainById } from '../lib/chains'
import { formatUsd, formatPct } from '../lib/formatters'
import { useUi } from '../store/ui'

/** the five largest counted holdings — a glanceable summary on the Dashboard */
export function TopHoldingsPreview() {
  const { countedByWallet, cryptoUsd } = usePortfolio()
  const setPage = useUi((s) => s.setPage)
  const top = topHoldings(countedByWallet).slice(0, 5)

  if (top.length === 0) return null

  const max = top[0].usd || 1

  return (
    <div className="mt-4 rounded-card glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="label-caps-xs">Top holdings</p>
        <button
          onClick={() => setPage('holdings')}
          className="flex cursor-pointer items-center gap-1 text-[12px] text-muted transition-colors hover:text-accent"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>
      <ul className="space-y-3">
        {top.map((h) => {
          const chain = chainById(h.chainId)
          const pctOfCrypto = cryptoUsd > 0 ? (h.usd / cryptoUsd) * 100 : 0
          return (
            <li key={h.id} className="flex items-center gap-3">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: chain?.color ?? '#52525b' }}
              />
              <span className="w-16 shrink-0 truncate text-[13px] text-primary">{h.symbol}</span>
              {/* proportional bar */}
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${Math.max(3, (h.usd / max) * 100)}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted">
                {formatPct(pctOfCrypto)}
              </span>
              <span className="w-28 shrink-0 text-right font-mono text-[13px] text-primary">
                {formatUsd(h.usd)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
