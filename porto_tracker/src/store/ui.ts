import { create } from 'zustand'
import type { CashAccount, Stock } from '../lib/db'

export type Page = 'dashboard' | 'holdings' | 'analytics' | 'history'

interface UiState {
  page: Page
  setPage: (p: Page) => void

  settingsOpen: boolean
  addWalletOpen: boolean
  /** null = closed, undefined-id record = add, otherwise edit */
  stockModal: { open: boolean; editing: Stock | null }
  cashModal: { open: boolean; editing: CashAccount | null }

  /** wallet ids currently refreshing */
  refreshingWallets: Record<string, boolean>
  refreshingStocks: boolean
  globalRefreshing: boolean

  setSettingsOpen: (v: boolean) => void
  setAddWalletOpen: (v: boolean) => void
  openStockModal: (editing?: Stock | null) => void
  closeStockModal: () => void
  openCashModal: (editing?: CashAccount | null) => void
  closeCashModal: () => void

  setWalletRefreshing: (id: string, v: boolean) => void
  setStocksRefreshing: (v: boolean) => void
  setGlobalRefreshing: (v: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  page: 'dashboard',
  setPage: (p) => set({ page: p }),

  settingsOpen: false,
  addWalletOpen: false,
  stockModal: { open: false, editing: null },
  cashModal: { open: false, editing: null },

  refreshingWallets: {},
  refreshingStocks: false,
  globalRefreshing: false,

  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setAddWalletOpen: (v) => set({ addWalletOpen: v }),
  openStockModal: (editing = null) => set({ stockModal: { open: true, editing } }),
  closeStockModal: () => set({ stockModal: { open: false, editing: null } }),
  openCashModal: (editing = null) => set({ cashModal: { open: true, editing } }),
  closeCashModal: () => set({ cashModal: { open: false, editing: null } }),

  setWalletRefreshing: (id, v) =>
    set((s) => ({ refreshingWallets: { ...s.refreshingWallets, [id]: v } })),
  setStocksRefreshing: (v) => set({ refreshingStocks: v }),
  setGlobalRefreshing: (v) => set({ globalRefreshing: v }),
}))
