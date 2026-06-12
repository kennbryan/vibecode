import { useEffect, useState } from 'react'
import { RefreshCw, Settings2 } from 'lucide-react'
import { Button, IconButton } from './ui/Button'
import { useUi } from '../store/ui'
import { refreshAll } from '../services/refresh'
import { timeAgo } from '../lib/formatters'
import { usePortfolio } from '../hooks/usePortfolio'

export function Header() {
  const { settings } = usePortfolio()
  const globalRefreshing = useUi((s) => s.globalRefreshing)
  const setSettingsOpen = useUi((s) => s.setSettingsOpen)

  // re-render "x min ago" every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-8 max-md:px-4">
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M16 5 L26 16 L16 27 L6 16 Z"
              fill="none"
              stroke="#C9F77E"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[15px] font-semibold tracking-[0.18em] text-primary">VAULT</span>
        </div>

        <span className="hidden text-[13px] text-muted sm:block">
          Last updated {timeAgo(settings.lastUpdated)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="accent"
            size="sm"
            onClick={() => void refreshAll()}
            disabled={globalRefreshing}
            aria-label="Refresh all balances and prices"
          >
            <RefreshCw size={14} className={globalRefreshing ? 'animate-spin' : ''} />
            {globalRefreshing ? 'Refreshing' : 'Refresh'}
          </Button>
          <IconButton onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <Settings2 size={16} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
