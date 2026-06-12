import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({ icon: Icon, title, body, cta, onCta }: {
  icon: LucideIcon
  title: string
  body: string
  cta: string
  onCta: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center glass-card">
      <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <Icon size={18} className="text-secondary" />
      </div>
      <div>
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="mt-1 max-w-[360px] text-[13px] leading-relaxed text-muted">{body}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onCta} className="mt-1">
        <Plus size={14} /> {cta}
      </Button>
    </div>
  )
}
