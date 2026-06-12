import { lazy, Suspense, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LineChart, TrendingDown, TrendingUp } from 'lucide-react'
import { db } from '../../lib/db'
import { formatPct, formatUsd } from '../../lib/formatters'
import { EmptyState } from '../ui/EmptyState'
import { CompactTotal } from '../CompactTotal'
import { useUi } from '../../store/ui'

const NetWorthChart = lazy(() => import('./NetWorthChart'))

type Range = '7d' | '30d' | 'all'
const RANGES: { key: Range; label: string; ms: number | null }[] = [
  { key: '7d', label: '7D', ms: 7 * 86_400_000 },
  { key: '30d', label: '30D', ms: 30 * 86_400_000 },
  { key: 'all', label: 'All', ms: null },
]

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-accent' : tone === 'down' ? 'text-danger' : 'text-primary'
  return (
    <div>
      <p className="label-caps-xs mb-1">{label}</p>
      <p className={`font-mono text-[15px] font-medium ${color}`}>{value}</p>
    </div>
  )
}

export function HistoryPage() {
  const [range, setRange] = useState<Range>('all')
  const setPage = useUi((s) => s.setPage)
  const all = useLiveQuery(() => db.snapshots.orderBy('ts').toArray(), [])
  // "now" captured once at mount — keeps the range filter pure across renders
  const [mountedAt] = useState(() => Date.now())

  // hooks must run unconditionally — compute the filtered window before any return
  const series = useMemo(() => {
    const rows = all ?? []
    const cutoff = RANGES.find((r) => r.key === range)!.ms
    if (!cutoff) return rows
    const filtered = rows.filter((s) => mountedAt - s.ts <= cutoff)
    return filtered.length > 0 ? filtered : rows
  }, [all, range, mountedAt])

  if (all === undefined) {
    return (
      <div className="pb-24">
        <CompactTotal title="History" />
        <div className="skeleton mt-8 h-[360px] rounded-card" />
      </div>
    )
  }

  if (all.length === 0) {
    return (
      <div className="pb-24">
        <CompactTotal title="History" />
        <div className="mt-10">
          <EmptyState
            icon={LineChart}
            title="No history yet"
            body="Your net worth is recorded every time you refresh. Hit Refresh a few times over the coming days and your timeline will build here."
            cta="Go to Holdings"
            onCta={() => setPage('holdings')}
          />
        </div>
      </div>
    )
  }

  const first = series[0]
  const last = series[series.length - 1]
  const deltaUsd = last.totalUsd - first.totalUsd
  const deltaPct = first.totalUsd > 0 ? (deltaUsd / first.totalUsd) * 100 : 0
  const peak = Math.max(...series.map((s) => s.totalUsd))
  const trough = Math.min(...series.map((s) => s.totalUsd))
  const tone = deltaUsd > 0 ? 'up' : deltaUsd < 0 ? 'down' : undefined
  const TrendIcon = deltaUsd >= 0 ? TrendingUp : TrendingDown

  return (
    <div className="pb-24">
      <CompactTotal title="History" />

      <div className="mt-8 rounded-card glass-card p-5">
        {/* stat row + range toggle */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <p className="label-caps-xs mb-1">Change</p>
              <p className={`flex items-center gap-1.5 font-mono text-[15px] font-medium ${tone === 'up' ? 'text-accent' : tone === 'down' ? 'text-danger' : 'text-primary'}`}>
                <TrendIcon size={14} />
                {deltaUsd >= 0 ? '+' : '−'}
                {formatUsd(Math.abs(deltaUsd)).replace('$', '$')}
                <span className="text-muted">({formatPct(Math.abs(deltaPct))})</span>
              </p>
            </div>
            <Stat label="Peak" value={formatUsd(peak)} />
            <Stat label="Low" value={formatUsd(trough)} />
            <Stat label="Points" value={String(series.length)} />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-edge bg-elevated p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  range === r.key ? 'bg-overlay text-primary' : 'text-muted hover:text-secondary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {series.length < 2 ? (
          <div className="flex h-[260px] flex-col items-center justify-center text-center">
            <p className="text-[13px] text-secondary">Only one data point so far.</p>
            <p className="mt-1 max-w-[320px] text-[12px] text-muted">
              Refresh again later to start drawing your net-worth trend.
            </p>
          </div>
        ) : (
          <Suspense fallback={<div className="skeleton h-[300px] rounded-lg" />}>
            <NetWorthChart data={series} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
