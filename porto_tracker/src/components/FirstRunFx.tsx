import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DEFAULT_SETTINGS, db, patchSettings } from '../lib/db'
import { fetchSuggestedRate } from '../services/fx'
import { Button } from './ui/Button'
import { Modal, Field, inputCls } from './ui/Modal'

/**
 * First-launch prompt: the user defines the USD/IDR rate before IDR values
 * are shown. Skippable — IDR renders as "Rp —" until a rate exists.
 */
export function FirstRunFx() {
  // missing row ≠ still loading: resolve to defaults so first launch is detectable
  const settings = useLiveQuery(async () => (await db.settings.get('app')) ?? DEFAULT_SETTINGS, [])
  const [draft, setDraft] = useState('')
  const [skipped, setSkipped] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  // wait for the query to resolve; show only when no rate has ever been set
  const open = settings !== undefined && settings.fxRate === null && !skipped

  const commit = async () => {
    const v = Number(draft)
    if (Number.isFinite(v) && v > 0) await patchSettings({ fxRate: v })
  }

  const suggest = async () => {
    setSuggesting(true)
    try {
      const rate = await fetchSuggestedRate('IDR')
      setDraft(String(Math.round(rate)))
    } catch {
      /* leave the field for manual entry */
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <Modal open={open} onClose={() => setSkipped(true)} title="Set your USD/IDR rate" blocking={false}>
      <p className="mb-4 text-[13px] leading-relaxed text-secondary">
        Vault shows every value in both USD and IDR using one rate that you control. Nothing is
        fetched automatically — you can pre-fill the current market rate, but it only applies when
        you confirm.
      </p>
      <Field label="IDR per 1 USD">
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void commit()}
          placeholder="18300"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => void suggest()} disabled={suggesting}>
          <Sparkles size={13} /> {suggesting ? 'Fetching…' : 'Suggest current rate'}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setSkipped(true)}>Later</Button>
          <Button
            variant="accent"
            onClick={() => void commit()}
            disabled={!Number.isFinite(Number(draft)) || Number(draft) <= 0}
          >
            Set rate
          </Button>
        </div>
      </div>
    </Modal>
  )
}
