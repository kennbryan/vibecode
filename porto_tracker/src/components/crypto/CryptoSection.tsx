import { Plus, WalletMinimal } from 'lucide-react'
import { Section } from '../ui/Section'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { WalletCard } from './WalletCard'
import { usePortfolio } from '../../hooks/usePortfolio'
import { formatIdr, formatUsd } from '../../lib/formatters'
import { useUi } from '../../store/ui'

export function CryptoSection() {
  const { wallets, cryptoUsd, toIdr } = usePortfolio()
  const setAddWalletOpen = useUi((s) => s.setAddWalletOpen)
  const idr = toIdr(cryptoUsd)

  return (
    <Section
      title="Crypto"
      subtotal={
        <>
          {formatUsd(cryptoUsd)}
          {idr !== null && <span className="text-muted"> · {formatIdr(idr)}</span>}
        </>
      }
      action={
        <Button variant="outline" size="sm" onClick={() => setAddWalletOpen(true)}>
          <Plus size={14} /> Wallet
        </Button>
      }
    >
      {wallets.length === 0 ? (
        <EmptyState
          icon={WalletMinimal}
          title="No wallets yet"
          body="Paste any wallet address — EVM, Solana or Bitcoin — and Vault scans every supported chain for balances. Addresses never leave your device except to query public chain data."
          cta="Add wallet"
          onCta={() => setAddWalletOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {wallets
            .slice()
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((w) => (
              <WalletCard key={w.id} wallet={w} />
            ))}
        </div>
      )}
    </Section>
  )
}
