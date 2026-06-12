import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Snapshot } from '../../lib/db'
import { formatIdr, formatUsd } from '../../lib/formatters'

/** compact axis label: $1.2M, $950K, $1,200 */
function shortUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

interface TooltipShape {
  active?: boolean
  payload?: { payload: Snapshot }[]
}

function ChartTooltip({ active, payload }: TooltipShape) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const idr = p.fxRate ? p.totalUsd * p.fxRate : null
  return (
    <div className="rounded-lg border border-edge-strong bg-overlay px-3 py-2 shadow-xl">
      <p className="mb-1 font-mono text-[13px] font-medium text-primary">{formatUsd(p.totalUsd)}</p>
      {idr !== null && <p className="font-mono text-[11px] text-muted">{formatIdr(idr)}</p>}
      <p className="mt-1 text-[11px] text-muted">
        {new Date(p.ts).toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  )
}

export default function NetWorthChart({ data }: { data: Snapshot[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9F77E" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#C9F77E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="ts"
          type="number"
          domain={['dataMin', 'dataMax']}
          scale="time"
          tickFormatter={(ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={{ stroke: '#1f1f23' }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={shortUsd}
          tick={{ fill: '#52525b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
          domain={['auto', 'auto']}
        />
        <Tooltip
          content={ChartTooltip as unknown as React.ReactElement}
          cursor={{ stroke: '#2a2a30' }}
        />
        <Area
          type="monotone"
          dataKey="totalUsd"
          stroke="#C9F77E"
          strokeWidth={2}
          fill="url(#nw)"
          isAnimationActive={true}
          animationDuration={500}
          dot={false}
          activeDot={{ r: 4, fill: '#C9F77E', stroke: '#0a0a0b', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
