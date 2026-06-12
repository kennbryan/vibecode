import { useEffect, useState } from 'react'
import { BarChart3, LineChart, RefreshCw, Settings2, Wallet, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, IconButton } from './ui/Button'
import { useUi, type Page } from '../store/ui'
import { refreshAll } from '../services/refresh'
import { timeAgo } from '../lib/formatters'
import { usePortfolio } from '../hooks/usePortfolio'

const TABS: { key: Page; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'holdings', label: 'Holdings', icon: Wallet },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'history', label: 'History', icon: LineChart },
]

function Tabs() {
  const page = useUi((s) => s.page)
  const setPage = useUi((s) => s.setPage)
  return (
    <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Pages">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = page === key
        return (
          <button
            key={key}
            onClick={() => setPage(key)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
              active ? 'text-primary' : 'text-muted hover:text-secondary'
            }`}
          >
            <Icon size={14} className={active ? 'text-accent' : ''} />
            {label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-px bg-accent" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

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
    <header className="sticky top-0 z-40 border-b border-white/5 bg-base/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-5 px-8 max-md:px-4">
        <div className="flex shrink-0 items-center gap-2.5">
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

        {/* tabs — hidden on small screens, shown in a second row below */}
        <div className="hidden md:block">
          <Tabs />
        </div>

        <span className="ml-auto hidden shrink-0 text-[13px] text-muted lg:block">
          Updated {timeAgo(settings.lastUpdated)}
        </span>

        <div className="flex shrink-0 items-center gap-2 max-md:ml-auto">
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

      {/* mobile tab row */}
      <div className="border-t border-white/5 px-4 py-1.5 md:hidden">
        <Tabs />
      </div>
    </header>
  )
}
