import { useState } from 'react'
import { db, uid, type CashAccount } from '../../lib/db'
import { CASH_CURRENCIES } from '../../lib/chains'
import { Button } from '../ui/Button'
import { Modal, Field, inputCls, selectCls } from '../ui/Modal'
import { useUi } from '../../store/ui'

/** mounts fresh on every open (Modal unmounts children when closed) */
function CashForm({ editing, close }: { editing: CashAccount | null; close: () => void }) {
  const [name, setName] = useState(editing?.accountName ?? '')
  const [currency, setCurrency] = useState<string>(editing?.currency ?? 'IDR')
  const [balance, setBalance] = useState(editing ? String(editing.balance) : '')

  const balanceNum = Number(balance)
  const valid = name.trim().length > 0 && Number.isFinite(balanceNum) && balanceNum >= 0

  const save = async () => {
    if (!valid) return
    const record = { accountName: name.trim(), currency, balance: balanceNum }
    if (editing) await db.cash.update(editing.id, record)
    else await db.cash.add({ ...record, id: uid() })
    close()
  }

  return (
    <div className="space-y-4">
      <Field label="Account name">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="BCA"
          maxLength={40}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={selectCls}>
            {CASH_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Balance">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder={currency === 'IDR' ? '120000000' : '15000'}
            className={`${inputCls} font-mono`}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
          />
        </Field>
      </div>

      {currency !== 'USD' && currency !== 'IDR' && (
        <p className="text-xs text-muted">
          {currency} converts to USD via the cross rate in Settings. Without one it's assumed 1:1
          and flagged.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={close}>Cancel</Button>
        <Button variant="accent" onClick={() => void save()} disabled={!valid}>
          {editing ? 'Save' : 'Add account'}
        </Button>
      </div>
    </div>
  )
}

export function CashModal() {
  const { open, editing } = useUi((s) => s.cashModal)
  const close = useUi((s) => s.closeCashModal)

  return (
    <Modal open={open} onClose={close} title={editing ? 'Edit account' : 'Add cash account'}>
      <CashForm key={editing?.id ?? 'new'} editing={editing} close={close} />
    </Modal>
  )
}
