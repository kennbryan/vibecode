import { CountUp } from './ui/CountUp'
import { usePortfolio } from '../hooks/usePortfolio'
import { formatIdr, formatUsd } from '../lib/formatters'

/**
 * Slim net-worth bar shown at the top of non-dashboard pages, so the total is
 * always visible without the full 220px hero. Title labels the current page.
 */
export function CompactTotal({ title }: { title: string }) {
  const { totalUsd, toIdr } = usePortfolio()
  const idr = toIdr(totalUsd)

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-white/5 pb-5 pt-8">
      <div>
        <p className="label-caps-xs mb-1">{title}</p>
        <p className="font-mono text-[28px] font-medium leading-none tracking-[-0.01em] text-primary text-glow-subtle">
          <CountUp value={totalUsd} format={formatUsd} />
        </p>
      </div>
      <p className="font-mono text-[13px] text-muted">
        {idr !== null ? <CountUp value={idr} format={formatIdr} /> : 'Rp —'}
      </p>
    </div>
  )
}
