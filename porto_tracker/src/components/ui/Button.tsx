import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'accent' | 'ghost' | 'outline' | 'danger'

const styles: Record<Variant, string> = {
  accent:
    'bg-accent text-black hover:bg-accent-dim font-medium shadow-[0_0_20px_rgba(201,247,126,0.2)] hover:shadow-[0_0_30px_rgba(201,247,126,0.3)]',
  ghost:
    'text-secondary hover:text-primary hover:bg-white/5',
  outline:
    'border border-white/10 text-secondary hover:text-primary hover:border-white/20 hover:bg-white/5',
  danger:
    'border border-danger/40 text-danger hover:bg-danger/10',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Button({ variant = 'outline', size = 'md', className = '', children, ...rest }: Props) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-[13px] gap-1.5' : 'h-9 px-4 text-sm gap-2'
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center rounded-lg transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${sizing} ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function IconButton({ className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-secondary transition-all duration-200 hover:bg-white/5 hover:text-primary disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
