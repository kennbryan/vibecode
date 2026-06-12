import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CircleAlert, CircleCheck, CircleX, ScanSearch } from 'lucide-react'
import { db, uid, type Wallet } from '../../lib/db'
import { detectAddress, normalizeAddress, type Detection } from '../../lib/address'
import { EVM_CHAINS } from '../../lib/chains'
import { truncateAddress } from '../../lib/formatters'
import { Button } from '../ui/Button'
import { Modal, Field, inputCls } from '../ui/Modal'
import { useUi } from '../../store/ui'
import { refreshWallet } from '../../services/refresh'

type EntryStatus = 'ok' | 'invalid' | 'unsupported' | 'duplicate'

interface Entry {
  raw: string
  detection: Detection | null
  status: EntryStatus
}

/** addresses never contain whitespace/commas, so splitting on them is safe */
function parseAddresses(text: string): string[] {
  const parts = text.split(/[\s,;]+/).filter(Boolean)
  return [...new Set(parts)] // dedupe within the paste itself
}

function classify(raw: string, existing: Wallet[], earlier: Entry[]): Entry {
  const detection = detectAddress(raw)
  if (!detection) return { raw, detection: null, status: 'invalid' }
  if (!detection.supported) return { raw, detection, status: 'unsupported' }
  const norm = normalizeAddress(raw, detection.family)
  const dupe =
    existing.some((w) => normalizeAddress(w.address, w.family) === norm) ||
    earlier.some(
      (e) =>
        e.status === 'ok' &&
        e.detection &&
        normalizeAddress(e.raw, e.detection.family) === norm,
    )
  return { raw, detection, status: dupe ? 'duplicate' : 'ok' }
}

const STATUS_META: Record<EntryStatus, { icon: typeof CircleCheck; cls: string; text: (e: Entry) => string }> = {
  ok: {
    icon: CircleCheck,
    cls: 'text-accent',
    text: (e) =>
      e.detection!.family === 'evm'
        ? `EVM — ${EVM_CHAINS.length} chains`
        : e.detection!.label,
  },
  duplicate: { icon: CircleAlert, cls: 'text-warning', text: () => 'already tracked' },
  unsupported: {
    icon: CircleAlert,
    cls: 'text-warning',
    text: (e) => `${e.detection!.label} — not yet supported`,
  },
  invalid: { icon: CircleX, cls: 'text-danger', text: () => 'unrecognized format' },
}

export function AddWalletModal() {
  const open = useUi((s) => s.addWalletOpen)
  const setOpen = useUi((s) => s.setAddWalletOpen)
  const walletsQuery = useLiveQuery(() => db.wallets.toArray(), [])
  const wallets = useMemo(() => walletsQuery ?? [], [walletsQuery])

  const [text, setText] = useState('')
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  const entries = useMemo(() => {
    const out: Entry[] = []
    for (const raw of parseAddresses(text)) out.push(classify(raw, wallets, out))
    return out
  }, [text, wallets])

  const ready = entries.filter((e) => e.status === 'ok')
  const canSave = ready.length > 0 && !saving

  const close = () => {
    setOpen(false)
    setText('')
    setLabel('')
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const base = label.trim()
      const records: Wallet[] = ready.map((e, i) => ({
        id: uid(),
        address: normalizeAddress(e.raw, e.detection!.family),
        label:
          ready.length === 1
            ? base || `Wallet ${wallets.length + 1}`
            : base
              ? `${base} ${i + 1}`
              : `Wallet ${wallets.length + i + 1}`,
        family: e.detection!.family,
        createdAt: Date.now() + i, // keep paste order stable in the list
        lastFetched: null,
        failedChains: [],
      }))
      await db.wallets.bulkAdd(records)
      close()
      // kick off scans without blocking the modal; stagger to be kind to APIs
      records.forEach((w, i) => setTimeout(() => void refreshWallet(w.id), i * 400))
    } finally {
      setSaving(false)
    }
  }

  const summary = (() => {
    if (entries.length === 0) return null
    const counts: Record<EntryStatus, number> = { ok: 0, duplicate: 0, unsupported: 0, invalid: 0 }
    for (const e of entries) counts[e.status]++
    const parts = [
      counts.ok > 0 && `${counts.ok} ready to scan`,
      counts.duplicate > 0 && `${counts.duplicate} duplicate`,
      counts.unsupported > 0 && `${counts.unsupported} unsupported`,
      counts.invalid > 0 && `${counts.invalid} invalid`,
    ].filter(Boolean)
    return parts.join(' · ')
  })()

  const rows = Math.min(Math.max(text.split('\n').length, 2), 8)

  return (
    <Modal open={open} onClose={close} title="Add wallets">
      <div className="space-y-4">
        <Field
          label="Addresses"
          hint={summary ?? 'Paste one or many — one per line. Chains are detected automatically.'}
        >
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'0x…\nbc1…\nSolana address'}
            spellCheck={false}
            autoComplete="off"
            rows={rows}
            className={`${inputCls} h-auto resize-none py-2.5 font-mono leading-relaxed`}
          />
        </Field>

        {entries.length > 0 && (
          <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-edge bg-elevated p-3">
            {entries.map((e) => {
              const meta = STATUS_META[e.status]
              const Icon = meta.icon
              return (
                <li key={e.raw} className="flex items-center gap-2 text-xs">
                  <Icon size={13} className={`shrink-0 ${meta.cls}`} />
                  <span className="font-mono text-secondary" title={e.raw}>
                    {truncateAddress(e.raw)}
                  </span>
                  <span className={`ml-auto text-right ${e.status === 'ok' ? 'text-muted' : meta.cls}`}>
                    {meta.text(e)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <Field
          label="Label (optional)"
          hint={ready.length > 1 ? 'With multiple wallets the label is numbered: "Trading 1", "Trading 2"…' : undefined}
        >
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Main wallet"
            maxLength={40}
            className={inputCls}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={close}>Cancel</Button>
          <Button variant="accent" onClick={() => void save()} disabled={!canSave}>
            <ScanSearch size={15} />
            {ready.length > 1 ? `Add & scan ${ready.length} wallets` : 'Add & scan'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
