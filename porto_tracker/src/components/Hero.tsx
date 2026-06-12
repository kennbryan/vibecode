import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { CountUp } from './ui/CountUp'
import { usePortfolio } from '../hooks/usePortfolio'
import { patchSettings } from '../lib/db'
import { formatIdr, formatRate, formatUsd } from '../lib/formatters'

function FxInlineEdit({ fxRate }: { fxRate: number | null }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = async () => {
    const v = Number(draft)
    if (Number.isFinite(v) && v > 0) {
      await patchSettings({ fxRate: v })
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="h-7 w-28 rounded-md border border-white/10 bg-white/5 px-2 font-mono text-[13px] text-primary focus:border-accent/60 focus:outline-none"
          placeholder="18300"
          aria-label="USD to IDR rate"
        />
        <button onClick={() => void commit()} className="cursor-pointer text-accent hover:text-accent-dim" aria-label="Save rate">
          <Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="cursor-pointer text-muted hover:text-secondary" aria-label="Cancel">
          <X size={14} />
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(fxRate ? String(fxRate) : '')
        setEditing(true)
      }}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label="Edit USD/IDR rate"
    >
      <span className="label-caps-xs">FX&ensp;USD/IDR</span>
      <span className="font-mono text-[13px] text-secondary">
        {fxRate ? formatRate(fxRate) : 'not set'}
      </span>
      <Pencil size={12} className="text-muted transition-colors group-hover:text-secondary" />
    </button>
  )
}

export function Hero() {
  const { totalUsd, toIdr, fxRate } = usePortfolio()
  const idr = toIdr(totalUsd)

  return (
    <section className="relative pt-16 pb-12">
      {/* Large ambient glow behind the number */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-72 w-[800px] rounded-full bg-accent/8 blur-[120px] pulse-glow-anim" />
      </div>

      <div className="relative text-center">
        {/* Top badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1">
          <span className="inline-block size-1.5 rounded-full bg-accent pulse-glow-anim" />
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-accent">Live Portfolio</span>
        </div>

        {/* Main total */}
        <h1 className="font-mono text-[72px] font-medium leading-none tracking-[-0.03em] gradient-text max-md:text-[48px]">
          <CountUp value={totalUsd} format={formatUsd} />
        </h1>

        {/* IDR conversion */}
        <p className="mt-4 font-mono text-xl text-secondary text-glow-subtle max-md:text-lg">
          {idr !== null ? (
            <CountUp value={idr} format={formatIdr} />
          ) : (
            <span className="text-muted">Rp —</span>
          )}
        </p>

        {/* FX rate editor */}
        <div className="mt-6">
          <FxInlineEdit fxRate={fxRate} />
        </div>
      </div>
    </section>
  )
}
