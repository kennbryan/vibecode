import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Collapsible dashboard section — uppercase label, subtotal on the right,
 * smooth grid-rows collapse.
 */
export function Section({ title, subtotal, action, children }: {
  title: string
  subtotal?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <section className="border-t border-edge pt-6">
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="group flex cursor-pointer items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          aria-expanded={open}
        >
          <ChevronDown
            size={15}
            className={`text-muted transition-transform duration-200 group-hover:text-secondary ${open ? '' : '-rotate-90'}`}
          />
          <h2 className="label-caps select-none">{title}</h2>
        </button>
        {subtotal && <div className="ml-1 hidden font-mono text-[13px] text-muted sm:block">{subtotal}</div>}
        <div className="ml-auto">{action}</div>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-2">{children}</div>
        </div>
      </div>
    </section>
  )
}
