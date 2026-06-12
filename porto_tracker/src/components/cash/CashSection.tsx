import { useState } from 'react'
import { Landmark, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Section } from '../ui/Section'
import { Button, IconButton } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { usePortfolio } from '../../hooks/usePortfolio'
import { db, type CashAccount } from '../../lib/db'
import { formatIdr, formatUsd } from '../../lib/formatters'
import { useUi } from '../../store/ui'

function formatNativeBalance(c: CashAccount): string {
  if (c.currency === 'IDR') return formatIdr(c.balance)
  if (c.currency === 'USD') return formatUsd(c.balance)
  return `${c.currency} ${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(c.balance)}`
}

function CashRow({ account }: { account: CashAccount }) {
  const { cashValueUsd } = usePortfolio()
  const openModal = useUi((s) => s.openCashModal)
  const [confirm, setConfirm] = useState(false)
  const { usd, assumed } = cashValueUsd(account)

  const remove = async () => {
    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 2500)
      return
    }
    await db.cash.delete(account.id)
  }

  return (
    <tr className="group border-b border-white/5 transition-colors duration-150 last:border-b-0 hover:bg-white/[0.03]">
      <td className="px-5 py-3 text-sm text-primary">{account.accountName}</td>
      <td className="px-4 py-3">
        <span className="text-[13px] text-secondary">{account.currency}</span>
        {assumed && (
          <span
            className="ml-2 inline-flex items-center gap-1 rounded border border-warning/30 px-1 py-px text-[10px] uppercase tracking-wide text-warning"
            title={`No ${account.currency} cross rate set — assuming 1:1 with USD. Set it in Settings.`}
          >
            <TriangleAlert size={9} /> 1:1
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-[13px] text-secondary">
        {formatNativeBalance(account)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-[13px] text-primary">{formatUsd(usd)}</td>
      <td className="w-20 px-3 py-2">
        <div className="flex justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <IconButton onClick={() => openModal(account)} aria-label={`Edit ${account.accountName}`}>
            <Pencil size={13} />
          </IconButton>
          <IconButton
            onClick={() => void remove()}
            aria-label={confirm ? 'Click again to confirm' : `Remove ${account.accountName}`}
            className={confirm ? 'bg-danger/15 text-danger opacity-100 hover:bg-danger/20 hover:text-danger' : ''}
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

export function CashSection() {
  const { cash, cashUsd, toIdr } = usePortfolio()
  const openModal = useUi((s) => s.openCashModal)
  const idr = toIdr(cashUsd)

  return (
    <Section
      title="Cash"
      subtotal={
        <>
          {formatUsd(cashUsd)}
          {idr !== null && <span className="text-muted"> · {formatIdr(idr)}</span>}
        </>
      }
      action={
        <Button variant="outline" size="sm" onClick={() => openModal(null)}>
          <Plus size={14} /> Account
        </Button>
      }
    >
      {cash.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No cash accounts"
          body="Add bank accounts and cash balances in USD, IDR, SGD or EUR. Balances are entered manually and never leave your device."
          cta="Add account"
          onCta={() => openModal(null)}
        />
      ) : (
        <div className="rounded-card glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="label-caps-xs px-5 py-3 text-left font-medium">Account</th>
                  <th className="label-caps-xs px-4 py-3 text-left font-medium">Currency</th>
                  <th className="label-caps-xs px-4 py-3 text-right font-medium">Balance</th>
                  <th className="label-caps-xs px-4 py-3 text-right font-medium">Value USD</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cash
                  .slice()
                  .sort((a, b) => a.accountName.localeCompare(b.accountName))
                  .map((c) => (
                    <CashRow key={c.id} account={c} />
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-4 border-t border-white/10 px-5 py-3">
            <span className="label-caps-xs">Cash total</span>
            <span className="font-mono text-sm font-medium text-primary">{formatUsd(cashUsd)}</span>
          </div>
        </div>
      )}
    </Section>
  )
}
