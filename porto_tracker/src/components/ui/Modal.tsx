import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from './Button'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  /** prevent closing via overlay / esc (first-run prompt) */
  blocking?: boolean
  children: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, blocking = false, children, width = 'max-w-[440px]' }: Props) {
  useEffect(() => {
    if (!open || blocking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, blocking, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={blocking ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${width} max-h-[88vh] overflow-y-auto rounded-2xl border border-edge-strong bg-overlay p-6 shadow-none`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-primary">{title}</h2>
          {!blocking && (
            <IconButton onClick={onClose} aria-label="Close">
              <X size={16} />
            </IconButton>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

/* shared form bits — keeps modals consistent */

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps-xs mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full h-10 rounded-lg border border-edge-strong bg-elevated px-3 text-sm text-primary placeholder:text-muted transition-colors duration-150 focus:border-accent/60 focus:outline-none'

export const selectCls = `${inputCls} appearance-none cursor-pointer`
