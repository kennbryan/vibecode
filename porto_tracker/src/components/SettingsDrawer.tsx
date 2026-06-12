import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, ShieldCheck, ShieldAlert, Sparkles, Upload, X } from 'lucide-react'
import {
  db,
  ensurePersistentStorage,
  getSettings,
  patchSettings,
  storageEstimate,
  type Settings,
} from '../lib/db'
import { usePortfolio } from '../hooks/usePortfolio'
import { fetchSuggestedRate } from '../services/fx'
import { Button, IconButton } from './ui/Button'
import { inputCls } from './ui/Modal'
import { useUi } from '../store/ui'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-edge pb-6">
      <p className="label-caps-xs mb-4">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] text-primary">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 ${checked ? 'bg-accent' : 'bg-edge-strong'}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-base transition-[left] duration-150 ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  )
}

/** numeric setting that commits on blur / enter */
function NumberInput({ value, onCommit, placeholder, width = 'w-28' }: {
  value: number | null
  onCommit: (v: number) => void
  placeholder?: string
  width?: string
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  // sync draft when the stored value changes elsewhere (render-time adjustment)
  const [prevValue, setPrevValue] = useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    setDraft(value != null ? String(value) : '')
  }

  const commit = () => {
    const v = Number(draft)
    if (Number.isFinite(v) && v >= 0 && draft.trim() !== '') onCommit(v)
    else setDraft(value != null ? String(value) : '')
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className={`${inputCls} ${width} h-9 text-right font-mono text-[13px]`}
    />
  )
}

/* ───────────────────────── export / import / wipe ──────────────────────── */

interface ExportPayload {
  app: 'vault'
  /** 1 = pre-history exports (no snapshots); 2 = includes snapshots */
  version: 1 | 2
  exportedAt: string
  settings: Settings
  wallets: unknown[]
  holdings: unknown[]
  stocks: unknown[]
  cash: unknown[]
  snapshots?: unknown[]
}

/* ─────────────────────────── storage status ────────────────────────────── */

function StoragePanel() {
  const [state, setState] = useState<{ persisted: boolean; supported: boolean } | null>(null)
  const [used, setUsed] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  // bumped to re-query persistence after the user requests it
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      const s = await ensurePersistentStorage()
      if (!active) return
      setState(s)
      const est = await storageEstimate()
      if (!active || !est || est.usage <= 0) return
      const kb = est.usage / 1024
      setUsed(kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`)
    })()
    return () => {
      active = false
    }
  }, [tick])

  const request = async () => {
    setRequesting(true)
    try {
      await ensurePersistentStorage()
      setTick((t) => t + 1)
    } finally {
      setRequesting(false)
    }
  }

  const persisted = state?.persisted ?? false
  const Icon = persisted ? ShieldCheck : ShieldAlert

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <Icon size={15} className={`mt-0.5 shrink-0 ${persisted ? 'text-accent' : 'text-warning'}`} />
        <div className="min-w-0">
          <p className="text-[13px] text-primary">
            {persisted ? 'Storage is persistent' : 'Storage is best-effort'}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {persisted
              ? 'Your data is protected from automatic browser cleanup. It stays until you clear site data or wipe it here.'
              : state?.supported === false
                ? "This browser doesn't support persistent storage. Data still saves, but a browser low on disk may clear it — keep a JSON export as backup."
                : 'The browser may evict data under disk pressure. Grant persistence so it never does.'}
          </p>
          {used && <p className="mt-1 font-mono text-[11px] text-muted">Using {used}</p>}
        </div>
      </div>
      {!persisted && state?.supported !== false && (
        <Button variant="outline" size="sm" onClick={() => void request()} disabled={requesting} className="w-full">
          {requesting ? 'Requesting…' : 'Make storage persistent'}
        </Button>
      )}
    </div>
  )
}

async function exportData() {
  const payload: ExportPayload = {
    app: 'vault',
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(),
    wallets: await db.wallets.toArray(),
    holdings: await db.holdings.toArray(),
    stocks: await db.stocks.toArray(),
    cash: await db.cash.toArray(),
    snapshots: await db.snapshots.toArray(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function DataTools() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ExportPayload | null>(null)
  const [wipeArmed, setWipeArmed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onFile = async (file: File) => {
    setMessage(null)
    try {
      const json = JSON.parse(await file.text()) as ExportPayload
      // accept v1 (no snapshots) and v2 (with snapshots)
      if (json.app !== 'vault' || (json.version !== 1 && json.version !== 2) || !Array.isArray(json.wallets)) {
        throw new Error('not a vault export')
      }
      setPending(json)
    } catch {
      setMessage('Invalid file — expected a Vault JSON export.')
    }
  }

  const applyImport = async (mode: 'replace' | 'merge') => {
    if (!pending) return
    const snapshots = Array.isArray(pending.snapshots) ? pending.snapshots : []
    await db.transaction(
      'rw',
      [db.wallets, db.holdings, db.stocks, db.cash, db.settings, db.snapshots],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.wallets.clear(), db.holdings.clear(), db.stocks.clear(), db.cash.clear(), db.snapshots.clear(),
          ])
          await db.settings.put({ ...pending.settings, key: 'app' })
        }
        /* eslint-disable @typescript-eslint/no-explicit-any */
        await db.wallets.bulkPut(pending.wallets as any)
        await db.holdings.bulkPut(pending.holdings as any)
        await db.stocks.bulkPut(pending.stocks as any)
        await db.cash.bulkPut(pending.cash as any)
        await db.snapshots.bulkPut(snapshots as any)
        /* eslint-enable @typescript-eslint/no-explicit-any */
      },
    )
    setPending(null)
    setMessage(mode === 'replace' ? 'Data replaced from file.' : 'Data merged from file.')
  }

  const wipe = async () => {
    if (!wipeArmed) {
      setWipeArmed(true)
      setTimeout(() => setWipeArmed(false), 3000)
      return
    }
    await db.delete()
    location.reload()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void exportData()} className="flex-1">
          <Download size={14} /> Export JSON
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="flex-1">
          <Upload size={14} /> Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onFile(f)
            e.target.value = ''
          }}
        />
      </div>

      {pending && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[13px] text-primary">
            Import {pending.wallets.length} wallets, {pending.stocks.length} stocks,{' '}
            {pending.cash.length} cash accounts?
          </p>
          <div className="mt-2.5 flex gap-2">
            <Button variant="accent" size="sm" onClick={() => void applyImport('replace')}>Replace all</Button>
            <Button variant="outline" size="sm" onClick={() => void applyImport('merge')}>Merge</Button>
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {message && <p className="text-xs text-secondary">{message}</p>}

      <Button variant="danger" size="sm" onClick={() => void wipe()} className="w-full">
        {wipeArmed ? 'Click again to permanently wipe everything' : 'Wipe all data'}
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Export and import are the only ways data leaves this device, and only when you trigger them.
      </p>
    </div>
  )
}

/* ───────────────────────────── the drawer ──────────────────────────────── */

export function SettingsDrawer() {
  const open = useUi((s) => s.settingsOpen)
  const setOpen = useUi((s) => s.setSettingsOpen)
  const { settings } = usePortfolio()
  const [suggesting, setSuggesting] = useState(false)
  const [suggested, setSuggested] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const suggest = async () => {
    setSuggesting(true)
    try {
      setSuggested(await fetchSuggestedRate('IDR'))
    } catch {
      setSuggested(null)
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
      />
      <aside
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 w-[400px] max-w-full overflow-y-auto border-l border-white/10 bg-overlay/90 backdrop-blur-xl transition-transform duration-200 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Settings"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-edge bg-overlay/60 backdrop-blur-xl px-6 py-4">
          <h2 className="text-[15px] font-medium text-primary">Settings</h2>
          <IconButton onClick={() => setOpen(false)} aria-label="Close settings">
            <X size={16} />
          </IconButton>
        </div>

        <div className="space-y-6 px-6 py-6">
          <Group title="Rates">
            <Row label="USD / IDR" hint="The single rate used for every IDR conversion.">
              <NumberInput
                value={settings.fxRate}
                placeholder="18300"
                onCommit={(v) => void patchSettings({ fxRate: v })}
              />
            </Row>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void suggest()} disabled={suggesting}>
                <Sparkles size={13} /> {suggesting ? 'Fetching…' : 'Suggest current rate'}
              </Button>
              {suggested !== null && (
                <button
                  onClick={() => {
                    void patchSettings({ fxRate: suggested })
                    setSuggested(null)
                  }}
                  className="cursor-pointer rounded-md border border-accent/40 px-2 py-1 font-mono text-xs text-accent transition-colors hover:bg-accent/10"
                >
                  Apply {new Intl.NumberFormat('en-US').format(suggested)}
                </button>
              )}
            </div>
            <Row label="SGD per USD" hint="Cross rate for SGD cash accounts.">
              <NumberInput
                value={settings.crossRates.SGD ?? null}
                placeholder="1.35"
                onCommit={(v) => void patchSettings({ crossRates: { ...settings.crossRates, SGD: v } })}
              />
            </Row>
            <Row label="EUR per USD" hint="Cross rate for EUR cash accounts.">
              <NumberInput
                value={settings.crossRates.EUR ?? null}
                placeholder="0.92"
                onCommit={(v) => void patchSettings({ crossRates: { ...settings.crossRates, EUR: v } })}
              />
            </Row>
          </Group>

          <Group title="Crypto">
            <Row label="Dust threshold" hint="Hide tokens worth less than this (USD).">
              <NumberInput
                value={settings.dustThresholdUsd}
                placeholder="1"
                width="w-20"
                onCommit={(v) => void patchSettings({ dustThresholdUsd: v })}
              />
            </Row>
            <Row label="Show empty chains" hint="List scanned chains even when they hold nothing.">
              <Toggle
                checked={settings.showEmptyChains}
                onChange={(v) => void patchSettings({ showEmptyChains: v })}
                label="Show empty chains"
              />
            </Row>
          </Group>

          <Group title="General">
            <Row label="Auto-refresh on load" hint="Fetch balances and prices when the app opens.">
              <Toggle
                checked={settings.autoRefresh}
                onChange={(v) => void patchSettings({ autoRefresh: v })}
                label="Auto refresh on load"
              />
            </Row>
          </Group>

          <Group title="Storage">
            <StoragePanel />
          </Group>

          <Group title="Data">
            <DataTools />
          </Group>

          <p className="pb-4 text-center text-[11px] text-muted">
            Vault · local-first · all data lives in this browser
          </p>
        </div>
      </aside>
    </>
  )
}
