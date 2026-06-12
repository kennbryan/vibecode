import { useState } from 'react'
import { LineSquiggle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Section } from '../ui/Section'
import { Button, IconButton } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { usePortfolio } from '../../hooks/usePortfolio'
import { db, type Stock } from '../../lib/db'
import { formatIdr, formatNativePrice, formatShares, formatUsd } from '../../lib/formatters'
import { useUi } from '../../store/ui'

function StockRow({ stock }: { stock: Stock }) {
  const { stockValueUsd } = usePortfolio()
  const openModal = useUi((s) => s.openStockModal)
  const [confirm, setConfirm] = useState(false)

  const remove = async () => {
    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 2500)
      return
    }
    await db.stocks.delete(stock.id)
  }

  return (
    <tr className="group border-b border-edge transition-colors duration-150 last:border-b-0 hover:bg-overlay/50">
      <td className="px-5 py-3">
        <span className="font-mono text-sm text-primary">{stock.ticker}</span>
        {stock.manualPrice && (
          <span
            className="ml-2 rounded border border-edge px-1 py-px text-[10px] uppercase tracking-wide text-muted"
            title="Manual price"
          >
            manual
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-[13px] text-secondary">{stock.exchange}</td>
      <td className="px-4 py-3 text-right font-mono text-[13px] text-secondary">
        {formatShares(stock.shares)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-[13px] text-secondary">
        {stock.priceNative != null ? formatNativePrice(stock.priceNative, stock.currency) : '—'}
      </td>
      <td className="px-4 py-3 text-right font-mono text-[13px] text-primary">
        {formatUsd(stockValueUsd(stock))}
      </td>
      <td className="w-20 px-3 py-2">
        <div className="flex justify-end gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
          <IconButton onClick={() => openModal(stock)} aria-label={`Edit ${stock.ticker}`}>
            <Pencil size={13} />
          </IconButton>
          <IconButton
            onClick={() => void remove()}
            aria-label={confirm ? 'Click again to confirm' : `Remove ${stock.ticker}`}
            className={confirm ? 'bg-danger/15 text-danger opacity-100 hover:bg-danger/20 hover:text-danger' : ''}
          >
            <Trash2 size={13} />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

export function StocksSection() {
  const { stocks, stocksUsd, toIdr } = usePortfolio()
  const openModal = useUi((s) => s.openStockModal)
  const idr = toIdr(stocksUsd)

  return (
    <Section
      title="Stocks"
      subtotal={
        <>
          {formatUsd(stocksUsd)}
          {idr !== null && <span className="text-muted"> · {formatIdr(idr)}</span>}
        </>
      }
      action={
        <Button variant="outline" size="sm" onClick={() => openModal(null)}>
          <Plus size={14} /> Holding
        </Button>
      }
    >
      {stocks.length === 0 ? (
        <EmptyState
          icon={LineSquiggle}
          title="No stock holdings"
          body="Track US and IDX equities by ticker and share count. Quotes are fetched on demand; illiquid positions can use a manual price."
          cta="Add holding"
          onCta={() => openModal(null)}
        />
      ) : (
        <div className="rounded-card overflow-hidden border border-edge bg-elevated">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-edge">
                  <th className="label-caps-xs px-5 py-3 text-left font-medium">Ticker</th>
                  <th className="label-caps-xs px-4 py-3 text-left font-medium">Exchange</th>
                  <th className="label-caps-xs px-4 py-3 text-right font-medium">Shares</th>
                  <th className="label-caps-xs px-4 py-3 text-right font-medium">Price</th>
                  <th className="label-caps-xs px-4 py-3 text-right font-medium">Value USD</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stocks
                  .slice()
                  .sort((a, b) => a.ticker.localeCompare(b.ticker))
                  .map((s) => (
                    <StockRow key={s.id} stock={s} />
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-4 border-t border-edge px-5 py-3">
            <span className="label-caps-xs">Stocks total</span>
            <span className="font-mono text-sm font-medium text-primary">{formatUsd(stocksUsd)}</span>
          </div>
        </div>
      )}
    </Section>
  )
}
