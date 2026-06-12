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
                transition: 'opacity 150ms ease-out',
                outline: 'none',
                cursor: hasData ? 'pointer' : 'default',
              }}
            />
          ))}
        </Pie>
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hovered ? (
          <>
            <span className="font-mono text-lg font-medium text-primary">{formatPct(hovered.pct)}</span>
            <span className="text-[11px] uppercase tracking-[0.08em] text-secondary">{hovered.label}</span>
          </>
        ) : (
          <span className="label-caps-xs">Allocation</span>
        )}
      </div>
    </div>
  )
}
