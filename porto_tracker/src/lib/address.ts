import type { AddressFamily } from './db'

export interface Detection {
  family: AddressFamily
  supported: boolean
  /** human-readable name for the detected family */
  label: string
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/

/**
 * Auto-detect the address family from its format. No chain selection —
 * the user pastes an address and we figure out where to look.
 *
 * Order matters: Bitcoin legacy / Tron are base58 too, so they're tested
 * before Solana's generic base58 pattern.
 */
export function detectAddress(raw: string): Detection | null {
  const addr = raw.trim()
  if (!addr) return null

  // EVM — 0x + 40 hex. One address covers every EVM chain.
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return { family: 'evm', supported: true, label: 'EVM' }
  }

  // Sui / Aptos — 0x + 64 hex
  if (/^0x[0-9a-fA-F]{64}$/.test(addr)) {
    return { family: 'move', supported: false, label: 'Sui / Aptos' }
  }

  // Bitcoin — bech32 (bc1…) or legacy base58 (1… / 3…)
  if (/^bc1[a-z0-9]{25,87}$/.test(addr)) {
    return { family: 'bitcoin', supported: true, label: 'Bitcoin' }
  }
  if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(addr) && addr.length <= 35) {
    return { family: 'bitcoin', supported: true, label: 'Bitcoin' }
  }

  // Tron — T + 33 base58
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) {
    return { family: 'tron', supported: false, label: 'Tron' }
  }

  // Cosmos ecosystem — bech32 with known prefixes
  if (/^(cosmos|osmo|celestia|inj|axelar|juno|akash)1[a-z0-9]{38,58}$/.test(addr)) {
    return { family: 'cosmos', supported: false, label: 'Cosmos' }
  }

  // TON — friendly format
  if (/^(EQ|UQ|kQ|0Q)[A-Za-z0-9_-]{46}$/.test(addr)) {
    return { family: 'ton', supported: false, label: 'TON' }
  }

  // Solana — generic base58, 32–44 chars
  if (addr.length >= 32 && addr.length <= 44 && BASE58.test(addr)) {
    return { family: 'solana', supported: true, label: 'Solana' }
  }

  return null
}

/** normalized form used for duplicate detection + API calls */
export function normalizeAddress(addr: string, family: AddressFamily): string {
  const a = addr.trim()
  // EVM addresses are case-insensitive (checksum is display-only)
  return family === 'evm' ? a.toLowerCase() : a
}
