import { PieChart, Pie, Cell } from 'recharts'
import { usePortfolio } from '../hooks/usePortfolio'
import { formatPct } from '../lib/formatters'
import { ALLOC_COLORS } from './allocation'

/**
 * The one chart in the app. Loaded lazily so Recharts stays out of the
 * initial bundle. Hover state is lifted to the parent so the legend can
 * drive the same dimming.
 */
export default function AllocationDonut({ active, setActive }: {
  active: number | null
  setActive: (i: number | null) => void
}) {
  const { allocation, totalUsd } = usePortfolio()

  const hasData = totalUsd > 0
  const data = hasData
    ? allocation.filter((a) => a.usd > 0)
    : [{ key: 'empty', label: '', usd: 1, pct: 0 }]

  const hovered = active !== null && hasData ? data[active] : null

  return (
    <div className="relative shrink-0" onMouseLeave={() => setActive(null)}>
      {/* Strong glow ring behind the chart */}
      <div
        className="pointer-events-none absolute inset-[-12px] rounded-full blur-xl transition-all duration-500"
        style={{
          opacity: hasData ? 0.5 : 0,
          background: hasData && hovered
            ? `radial-gradient(circle, ${ALLOC_COLORS[hovered.key]}30 0%, transparent 70%)`
            : 'radial-gradient(circle, rgba(201,247,126,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Secondary tighter glow */}
      <div
        className="pointer-events-none absolute inset-[-4px] rounded-full blur-md transition-all duration-500"
        style={{
          opacity: hasData ? 0.4 : 0,
          background: hasData && hovered
            ? `radial-gradient(circle, ${ALLOC_COLORS[hovered.key]}20 0%, transparent 60%)`
            : 'radial-gradient(circle, rgba(201,247,126,0.04) 0%, transparent 60%)',
        }}
      />

      <PieChart width={132} height={132}>
        <Pie
          data={data}
          dataKey="usd"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={64}
          paddingAngle={hasData && data.length > 1 ? 3 : 0}
          cornerRadius={5}
          stroke="none"
          isAnimationActive={true}
          animationDuration={500}
          onMouseEnter={(_, index) => hasData && setActive(index)}
        >
          {data.map((d, i) => (
            <Cell
              key={d.key}
              fill={hasData ? ALLOC_COLORS[d.key] : '#1F1F23'}
              opacity={active === null || active === i ? 1 : 0.3}
              style={{
                transition: 'all 200ms ease-out',
                outline: 'none',
                cursor: hasData ? 'pointer' : 'default',
                filter: hasData && (active === null || active === i)
                  ? `drop-shadow(0 0 8px ${ALLOC_COLORS[d.key]}60)`
                  : 'none',
                transform: hasData && active === i ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: 'center',
              }}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hovered ? (
          <>
            <span className="font-mono text-lg font-medium text-primary text-glow-subtle">{formatPct(hovered.pct)}</span>
            <span className="text-[11px] uppercase tracking-[0.08em] text-secondary">{hovered.label}</span>
          </>
        ) : (
          <span className="label-caps-xs">Allocation</span>
        )}
      </div>
    </div>
  )
}
