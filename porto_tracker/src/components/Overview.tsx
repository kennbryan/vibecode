import { lazy, Suspense, useState } from 'react'
import { CountUp } from './ui/CountUp'
import { usePortfolio } from '../hooks/usePortfolio'
import { formatIdr, formatPct, formatUsd } from '../lib/formatters'
import { ALLOC_COLORS } from './allocation'

// Recharts is the heaviest dependency and only powers this one donut —
// keep it out of the initial bundle so cold load stays fast.
const AllocationDonut = lazy(() => import('./AllocationDonut'))

function CategoryCard({ label, usd, pct, idr }: {
  label: string
  usd: number
  pct: number
  idr: number | null
}) {
  return (
    <div className="rounded-card border border-edge bg-elevated p-5 transition-colors duration-150 hover:border-edge-strong">
      <div className="flex items-center justify-between">
        <p className="label-caps-xs">{label}</p>
        <span
          className="rounded-md border border-edge px-1.5 py-0.5 font-mono text-[11px]"
          style={{ color: ALLOC_COLORS[label.toLowerCase()] }}
        >
          {formatPct(pct)}
        </span>
      </div>
      <p className="mt-4 font-mono text-[26px] font-medium leading-none tracking-[-0.01em] text-primary">
        <CountUp value={usd} format={formatUsd} />
      </p>
      <p className="mt-2 font-mono text-[13px] text-muted">
        {idr !== null ? formatIdr(idr) : 'Rp —'}
      </p>
    </div>
  )
}

function AllocationCard() {
  const { allocation, totalUsd } = usePortfolio()
  const [active, setActive] = useState<number | null>(null)

  const segments = totalUsd > 0 ? allocation.filter((a) => a.usd > 0) : []

  return (
    <div className="rounded-card flex items-center gap-5 border border-edge bg-elevated p-5 transition-colors duration-150 hover:border-edge-strong max-lg:col-span-2 max-md:col-span-1 max-md:flex-col max-md:items-start">
      <Suspense fallback={<div className="skeleton size-[132px] shrink-0 rounded-full" />}>
        <AllocationDonut active={active} setActive={setActive} />
      </Suspense>

      <ul className="flex w-full flex-col gap-2.5">
        {allocation.map((a) => {
          const idx = segments.findIndex((s) => s.key === a.key)
          const dim = active !== null && idx !== active
          return (
            <li
              key={a.key}
              className="flex items-center gap-2.5 transition-opacity duration-150"
              style={{ opacity: dim ? 0.35 : 1 }}
              onMouseEnter={() => idx >= 0 && setActive(idx)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="size-2 rounded-full" style={{ background: ALLOC_COLORS[a.key] }} />
              <span className="text-[13px] text-secondary">{a.label}</span>
              <span className="ml-auto font-mono text-[13px] text-muted">{formatUsd(a.usd)}</span>
              <span className="w-11 text-right font-mono text-[13px] text-primary">{formatPct(a.pct)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Overview() {
  const { cryptoUsd, stocksUsd, cashUsd, allocation, toIdr } = usePortfolio()
  const pct = Object.fromEntries(allocation.map((a) => [a.key, a.pct]))

  return (
    <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
      <CategoryCard label="Crypto" usd={cryptoUsd} pct={pct.crypto} idr={toIdr(cryptoUsd)} />
      <CategoryCard label="Stocks" usd={stocksUsd} pct={pct.stocks} idr={toIdr(stocksUsd)} />
      <CategoryCard label="Cash" usd={cashUsd} pct={pct.cash} idr={toIdr(cashUsd)} />
      <AllocationCard />
    </div>
  )
}
