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
          className="h-7 w-28 rounded-md border border-edge-strong bg-elevated px-2 font-mono text-[13px] text-primary focus:border-accent/60 focus:outline-none"
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
      className="group inline-flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
    <section className="pt-14 pb-12">
      <p className="label-caps mb-4">Total Net Worth</p>
      <p className="font-mono text-[56px] font-medium leading-none tracking-[-0.02em] text-primary max-md:text-[40px]">
        <CountUp value={totalUsd} format={formatUsd} />
      </p>
      <p className="mt-3 font-mono text-xl text-secondary max-md:text-lg">
        {idr !== null ? <CountUp value={idr} format={formatIdr} /> : <span className="text-muted">Rp —</span>}
      </p>
      <div className="mt-5">
        <FxInlineEdit fxRate={fxRate} />
      </div>
    </section>
  )
}
