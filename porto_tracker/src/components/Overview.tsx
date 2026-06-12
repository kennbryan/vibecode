import { useState, useEffect } from 'react'
import { CountUp } from './ui/CountUp'
import { usePortfolio } from '../hooks/usePortfolio'
import { formatIdr, formatPct, formatUsd } from '../lib/formatters'
import { ALLOC_COLORS } from './allocation'

function CategoryCard({ label, usd, pct, idr }: {
  label: string
  usd: number
  pct: number
  idr: number | null
}) {
  const color = ALLOC_COLORS[label.toLowerCase()]
  return (
    <div className="rounded-2xl glass-card p-6 group relative overflow-hidden">
      {/* Background glow that appears on hover */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-0 blur-[60px] transition-opacity duration-700 group-hover:opacity-40"
        style={{ background: color }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <p className="label-caps-xs">{label}</p>
          <span
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] font-medium"
            style={{ color: color }}
          >
            {formatPct(pct)}
          </span>
        </div>
        <p className="font-mono text-[28px] font-medium leading-none tracking-[-0.02em] text-primary text-glow-subtle">
          <CountUp value={usd} format={formatUsd} />
        </p>
        <p className="mt-2 font-mono text-[13px] text-muted">
          {idr !== null ? formatIdr(idr) : 'Rp —'}
        </p>
        {/* Mini progress bar */}
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.max(pct, 0)}%`,
              background: color,
              boxShadow: `0 0 10px ${color}60`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── Custom SVG Ring Chart ─────────────────────── */

const RADIUS = 110
const STROKE = 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function RingSegment({
  offset,
  length,
  color,
  index,
  active,
  setActive,
}: {
  offset: number
  length: number
  color: string
  index: number
  active: number | null
  setActive: (i: number | null) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100 + index * 200)
    return () => clearTimeout(t)
  }, [index])

  const isActive = active === index
  const isDim = active !== null && active !== index

  return (
    <g
      onMouseEnter={() => setActive(index)}
      onMouseLeave={() => setActive(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow filter for active segment */}
      <defs>
        <filter id={`glow-${index}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx="140"
        cy="140"
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE + (isActive ? 2 : 0)}
        strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
        strokeDashoffset={mounted ? -offset : -offset - length}
        strokeLinecap="round"
        transform="rotate(-90 140 140)"
        style={{
          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1), stroke-width 0.2s ease, opacity 0.2s ease',
          opacity: isDim ? 0.25 : 1,
          filter: isActive ? `url(#glow-${index})` : 'none',
        }}
      />
    </g>
  )
}

function AllocationViz() {
  const { allocation, totalUsd } = usePortfolio()
  const [active, setActive] = useState<number | null>(null)

  const segments = totalUsd > 0
    ? allocation.filter((a) => a.usd > 0)
    : []

  const hasData = segments.length > 0

  // Build stroke segments
  const rings = hasData
    ? segments.map((s, i) => {
        const pct = s.usd / totalUsd
        const length = pct * CIRCUMFERENCE
        const prevTotal = segments.slice(0, i).reduce((sum, seg) => sum + (seg.usd / totalUsd) * CIRCUMFERENCE, 0)
        return { ...s, length, offset: prevTotal, index: i, color: ALLOC_COLORS[s.key] }
      })
    : []

  // Center label + glow derived straight from hover state (no effect needed)
  const hovered = active !== null ? rings[active] : undefined
  const hoveredLabel = hovered?.label ?? null
  const hoveredPct = hovered ? formatPct(hovered.pct) : null
  const hoveredColor = hovered?.color ?? null

  return (
    <div className="rounded-2xl glass-card p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full blur-[80px] transition-colors duration-500"
        style={{
          background: hoveredColor
            ? `radial-gradient(circle, ${hoveredColor}25 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(201,247,126,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex items-center gap-8 max-lg:flex-col max-lg:items-center">
        {/* SVG Ring */}
        <div className="relative shrink-0">
          <svg width="280" height="280" viewBox="0 0 280 280" className="max-md:scale-90">
            {/* Track ring */}
            <circle
              cx="140"
              cy="140"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={STROKE}
            />

            {/* Data segments */}
            {rings.map((r) => (
              <RingSegment
                key={r.key}
                offset={r.offset}
                length={r.length}
                color={r.color}
                index={r.index}
                active={active}
                setActive={setActive}
              />
            ))}

            {/* Center text */}
            <foreignObject x="70" y="70" width="140" height="140">
              <div className="flex h-full flex-col items-center justify-center text-center">
                {hoveredPct ? (
                  <>
                    <span className="font-mono text-[28px] font-semibold leading-none text-primary text-glow-subtle">
                      {hoveredPct}
                    </span>
                    <span className="mt-1 text-[11px] uppercase tracking-[0.1em] text-secondary">
                      {hoveredLabel}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-mono text-[22px] font-semibold leading-none text-primary text-glow-subtle">
                      {hasData ? formatPct(100) : '0%'}
                    </span>
                    <span className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted">
                      {hasData ? 'Total' : 'Allocation'}
                    </span>
                  </>
                )}
              </div>
            </foreignObject>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 max-lg:w-full">
          <div className="mb-4 flex items-center gap-2">
            <span className="label-caps-xs">Portfolio Allocation</span>
          </div>
          <div className="space-y-3">
            {allocation.map((a) => {
              const idx = segments.findIndex((s) => s.key === a.key)
              const isActive = active === idx
              const isDim = active !== null && !isActive
              const color = ALLOC_COLORS[a.key]
              return (
                <div
                  key={a.key}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 cursor-pointer"
                  style={{
                    opacity: isDim ? 0.35 : 1,
                    background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                  }}
                  onMouseEnter={() => idx >= 0 && setActive(idx)}
                  onMouseLeave={() => setActive(null)}
                >
                  {/* Segment bar mini-chart */}
                  <div className="relative h-10 w-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="absolute bottom-0 w-full rounded-full transition-all duration-500"
                      style={{
                        height: `${Math.max(a.pct, 3)}%`,
                        background: color,
                        boxShadow: isActive ? `0 0 12px ${color}80` : `0 0 6px ${color}40`,
                        opacity: isActive ? 1 : 0.7,
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{
                          background: color,
                          boxShadow: `0 0 8px ${color}60`,
                        }}
                      />
                      <span className="text-[14px] font-medium text-primary">{a.label}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-[12px] text-muted">{formatUsd(a.usd)}</span>
                      <span className="font-mono text-[12px]" style={{ color }}>
                        {formatPct(a.pct)}
                      </span>
                    </div>
                  </div>

                  {/* Right chevron hint */}
                  <div
                    className="h-8 w-8 rounded-full border border-white/5 flex items-center justify-center transition-all duration-200"
                    style={{
                      borderColor: isActive ? `${color}40` : 'rgba(255,255,255,0.05)',
                      background: isActive ? `${color}10` : 'transparent',
                    }}
                  >
                    <span className="font-mono text-[11px] text-secondary">{formatPct(a.pct)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export function Overview() {
  const { cryptoUsd, stocksUsd, cashUsd, allocation, toIdr } = usePortfolio()
  const pct = Object.fromEntries(allocation.map((a) => [a.key, a.pct]))

  return (
    <div className="space-y-4">
      {/* Top row: 3 category cards */}
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
        <CategoryCard label="Crypto" usd={cryptoUsd} pct={pct.crypto} idr={toIdr(cryptoUsd)} />
        <CategoryCard label="Stocks" usd={stocksUsd} pct={pct.stocks} idr={toIdr(stocksUsd)} />
        <CategoryCard label="Cash" usd={cashUsd} pct={pct.cash} idr={toIdr(cashUsd)} />
      </div>

      {/* Bottom row: full-width allocation visualization */}
      <AllocationViz />
    </div>
  )
}
