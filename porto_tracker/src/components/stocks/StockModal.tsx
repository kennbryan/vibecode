import { useState } from 'react'
import { db, uid, type Exchange, type Stock } from '../../lib/db'
import { Button } from '../ui/Button'
import { Modal, Field, inputCls, selectCls } from '../ui/Modal'
import { useUi } from '../../store/ui'
import { fetchQuote } from '../../services/stocks'

/**
 * The form mounts fresh each time the modal opens (Modal unmounts children
 * when closed), so state initializes straight from the record being edited.
 */
function StockForm({ editing, close }: { editing: Stock | null; close: () => void }) {
  const [ticker, setTicker] = useState(editing?.ticker ?? '')
  const [exchange, setExchange] = useState<Exchange>(editing?.exchange ?? 'US')
  const [shares, setShares] = useState(editing ? String(editing.shares) : '')
  const [manualPrice, setManualPrice] = useState(editing?.manualPrice ?? false)
  const [price, setPrice] = useState(editing?.priceNative != null ? String(editing.priceNative) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sharesNum = Number(shares)
  const priceNum = Number(price)
  const valid =
    ticker.trim().length > 0 &&
    Number.isFinite(sharesNum) &&
    sharesNum > 0 &&
    (!manualPrice || (Number.isFinite(priceNum) && priceNum > 0))

  const currency = exchange === 'IDX' ? 'IDR' : 'USD'

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)

    const base = {
      ticker: ticker.trim().toUpperCase(),
      exchange,
      shares: sharesNum,
      currency: currency as 'USD' | 'IDR',
      manualPrice,
    }

    try {
      if (manualPrice) {
        const record = { ...base, priceNative: priceNum, lastFetched: null }
        if (editing) await db.stocks.update(editing.id, record)
        else await db.stocks.add({ ...record, id: uid() })
        close()
        return
      }

      // auto price — fetch a quote now so the row is never valueless
      let quote: { price: number; currency: 'USD' | 'IDR' } | null = null
      try {
        quote = await fetchQuote(base)
      } catch {
        setError(
          'Could not fetch a quote for this ticker. Check the symbol, or switch to manual price.',
        )
        setSaving(false)
        return
      }
      const record = {
        ...base,
        currency: quote.currency,
        priceNative: quote.price,
        lastFetched: Date.now(),
      }
      if (editing) await db.stocks.update(editing.id, record)
      else await db.stocks.add({ ...record, id: uid() })
      close()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker">
          <input
            autoFocus
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder={exchange === 'IDX' ? 'BBCA' : 'AAPL'}
            spellCheck={false}
            className={`${inputCls} font-mono uppercase`}
          />
        </Field>
        <Field label="Exchange">
          <select
            value={exchange}
            onChange={(e) => setExchange(e.target.value as Exchange)}
            className={selectCls}
          >
            <option value="US">US (USD)</option>
            <option value="IDX">IDX (IDR)</option>
          </select>
        </Field>
      </div>

      <Field label="Shares">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="100"
          className={`${inputCls} font-mono`}
        />
      </Field>

      <div className="flex items-center justify-between rounded-lg border border-edge bg-elevated px-3 py-2.5">
        <div>
          <p className="text-[13px] text-primary">Manual price</p>
          <p className="text-xs text-muted">For illiquid holdings — skips the quote API</p>
        </div>
        <button
          role="switch"
          aria-checked={manualPrice}
          onClick={() => setManualPrice((v) => !v)}
          className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 ${manualPrice ? 'bg-accent' : 'bg-edge-strong'}`}
        >
          <span
            className={`absolute top-0.5 size-4 rounded-full bg-base transition-[left] duration-150 ${manualPrice ? 'left-[18px]' : 'left-0.5'}`}
          />
        </button>
      </div>

      {manualPrice && (
        <Field label={`Price per share (${currency})`}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={currency === 'IDR' ? '9150' : '200.00'}
            className={`${inputCls} font-mono`}
          />
        </Field>
      )}

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="accent" onClick={() => void save()} disabled={!valid || saving}>
          {saving ? 'Fetching quote…' : editing ? 'Save' : 'Add holding'}
        </Button>
      </div>
    </div>
  )
}

export function StockModal() {
  const { open, editing } = useUi((s) => s.stockModal)
  const close = useUi((s) => s.closeStockModal)

  return (
    <Modal open={open} onClose={close} title={editing ? 'Edit holding' : 'Add holding'}>
      <StockForm key={editing?.id ?? 'new'} editing={editing} close={close} />
    </Modal>
  )
}
