import { useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Overview } from './components/Overview'
import { CryptoSection } from './components/crypto/CryptoSection'
import { AddWalletModal } from './components/crypto/AddWalletModal'
import { StocksSection } from './components/stocks/StocksSection'
import { StockModal } from './components/stocks/StockModal'
import { CashSection } from './components/cash/CashSection'
import { CashModal } from './components/cash/CashModal'
import { SettingsDrawer } from './components/SettingsDrawer'
import { FirstRunFx } from './components/FirstRunFx'
import { ensurePersistentStorage, getSettings } from './lib/db'
import { refreshAll } from './services/refresh'

export default function App() {
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
    <div className="page-vignette min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1280px] px-8 pb-24 max-md:px-4">
        <Hero />
        <Overview />
        <div className="mt-12 space-y-10">
          <CryptoSection />
          <StocksSection />
          <CashSection />
        </div>
      </main>

      <footer className="border-t border-edge py-6">
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
  )
}
