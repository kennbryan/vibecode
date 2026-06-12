import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Overview } from './components/Overview'
import { CompactTotal } from './components/CompactTotal'
import { CryptoSection } from './components/crypto/CryptoSection'
import { AddWalletModal } from './components/crypto/AddWalletModal'
import { StocksSection } from './components/stocks/StocksSection'
import { StockModal } from './components/stocks/StockModal'
import { CashSection } from './components/cash/CashSection'
import { CashModal } from './components/cash/CashModal'
import { AnalyticsPage } from './components/analytics/AnalyticsPage'
import { HistoryPage } from './components/history/HistoryPage'
import { SettingsDrawer } from './components/SettingsDrawer'
import { FirstRunFx } from './components/FirstRunFx'
import { AnimatedBackground } from './components/AnimatedBackground'
import { ensurePersistentStorage, getSettings } from './lib/db'
import { refreshAll } from './services/refresh'
import { useUi } from './store/ui'

function DashboardPage() {
  return (
    <>
      <Hero />
      <Overview />
    </>
  )
}

function HoldingsPage() {
  return (
    <>
      <CompactTotal title="Holdings" />
      <div className="mt-8 space-y-10">
        <CryptoSection />
        <StocksSection />
        <CashSection />
      </div>
    </>
  )
}

export default function App() {
  const page = useUi((s) => s.page)

  // run once on load
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    // ask the browser to never auto-evict our data
    void ensurePersistentStorage()
    // auto-refresh only if the user enabled it
    void getSettings().then((s) => {
      if (s.autoRefresh) void refreshAll()
    })
  }, [])

  return (
    <div className="relative min-h-screen bg-base">
      <AnimatedBackground />
      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-[1280px] px-8 pb-24 max-md:px-4">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'holdings' && <HoldingsPage />}
          {page === 'analytics' && <AnalyticsPage />}
          {page === 'history' && <HistoryPage />}
        </main>

        <footer className="border-t border-white/5 py-6 backdrop-blur-sm">
          <p className="mx-auto max-w-[1280px] px-8 text-[11px] text-muted max-md:px-4">
            Local-first · data never leaves this device except read-only price &amp; balance lookups
          </p>
        </footer>

        <SettingsDrawer />
        <AddWalletModal />
        <StockModal />
        <CashModal />
        <FirstRunFx />
      </div>
    </div>
  )
}
