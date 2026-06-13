/**
 * chains.ts — config-driven chain registry.
 * Adding a chain is one entry here; nothing else in the app changes.
 *
 * Two EVM provider kinds:
 *  - `blockscout`: token discovery via a public Blockscout instance (no API
 *    key). The native coin balance comes from `rpcUrl` (live JSON-RPC) when
 *    set, because Blockscout's indexed `coin_balance` can lag the chain head
 *    by minutes — RPC `eth_getBalance` is always current.
 *  - `rpc`: chains without a keyless indexer — native balance via JSON-RPC
 *    plus a curated list of major tokens checked with `balanceOf`.
 */

export interface CuratedToken {
  symbol: string
  name: string
  address: string
  decimals: number
  coingeckoId: string
}

export type EvmProvider =
  | { kind: 'blockscout'; baseUrl: string; rpcUrl?: string }
  | { kind: 'rpc'; rpcUrl: string; nativeCoingeckoId: string; tokens: CuratedToken[] }

export interface ChainConfig {
  id: string
  name: string
  family: 'evm' | 'solana' | 'bitcoin'
  nativeSymbol: string
  nativeName: string
  nativeDecimals: number
  /** tiny identity dot in the UI */
  color: string
  provider?: EvmProvider
}

export const EVM_CHAINS: ChainConfig[] = [
  {
    id: 'ethereum', name: 'Ethereum', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#627EEA',
    provider: { kind: 'blockscout', baseUrl: 'https://eth.blockscout.com', rpcUrl: 'https://ethereum-rpc.publicnode.com' },
  },
  {
    id: 'base', name: 'Base', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#0052FF',
    provider: { kind: 'blockscout', baseUrl: 'https://base.blockscout.com', rpcUrl: 'https://base-rpc.publicnode.com' },
  },
  {
    id: 'arbitrum', name: 'Arbitrum', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#28A0F0',
    provider: { kind: 'blockscout', baseUrl: 'https://arbitrum.blockscout.com', rpcUrl: 'https://arbitrum-one-rpc.publicnode.com' },
  },
  {
    // optimism.blockscout.com doesn't send CORS headers — use the official RPC
    id: 'optimism', name: 'Optimism', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#FF0420',
    provider: {
      kind: 'rpc',
      rpcUrl: 'https://mainnet.optimism.io',
      nativeCoingeckoId: 'ethereum',
      tokens: [
        { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, coingeckoId: 'usd-coin' },
        { symbol: 'USDC.e', name: 'Bridged USDC', address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', decimals: 6, coingeckoId: 'usd-coin' },
        { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6, coingeckoId: 'tether' },
        { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18, coingeckoId: 'optimism' },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18, coingeckoId: 'weth' },
        { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
      ],
    },
  },
  {
    id: 'polygon', name: 'Polygon', family: 'evm',
    nativeSymbol: 'POL', nativeName: 'Polygon', nativeDecimals: 18, color: '#8247E5',
    provider: { kind: 'blockscout', baseUrl: 'https://polygon.blockscout.com', rpcUrl: 'https://polygon-bor-rpc.publicnode.com' },
  },
  {
    id: 'gnosis', name: 'Gnosis', family: 'evm',
    nativeSymbol: 'XDAI', nativeName: 'xDai', nativeDecimals: 18, color: '#04795B',
    provider: { kind: 'blockscout', baseUrl: 'https://gnosis.blockscout.com', rpcUrl: 'https://gnosis-rpc.publicnode.com' },
  },
  {
    id: 'zksync', name: 'zkSync Era', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#8C8DFC',
    provider: { kind: 'blockscout', baseUrl: 'https://zksync.blockscout.com', rpcUrl: 'https://mainnet.era.zksync.io' },
  },
  {
    // scroll.blockscout.com doesn't send CORS headers — use the official RPC
    id: 'scroll', name: 'Scroll', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#FFDBB0',
    provider: {
      kind: 'rpc',
      rpcUrl: 'https://rpc.scroll.io',
      nativeCoingeckoId: 'ethereum',
      tokens: [
        { symbol: 'USDC', name: 'USD Coin', address: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', decimals: 6, coingeckoId: 'usd-coin' },
        { symbol: 'USDT', name: 'Tether USD', address: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df', decimals: 6, coingeckoId: 'tether' },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0x5300000000000000000000000000000000000004', decimals: 18, coingeckoId: 'weth' },
      ],
    },
  },
  {
    // Linea's explorer doesn't send CORS headers — use the official RPC
    id: 'linea', name: 'Linea', family: 'evm',
    nativeSymbol: 'ETH', nativeName: 'Ether', nativeDecimals: 18, color: '#61DFFF',
    provider: {
      kind: 'rpc',
      rpcUrl: 'https://rpc.linea.build',
      nativeCoingeckoId: 'ethereum',
      tokens: [
        { symbol: 'USDC', name: 'USD Coin', address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', decimals: 6, coingeckoId: 'usd-coin' },
        { symbol: 'USDT', name: 'Tether USD', address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93', decimals: 6, coingeckoId: 'tether' },
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', decimals: 18, coingeckoId: 'weth' },
      ],
    },
  },
  {
    id: 'bnb', name: 'BNB Chain', family: 'evm',
    nativeSymbol: 'BNB', nativeName: 'BNB', nativeDecimals: 18, color: '#F0B90B',
    provider: {
      kind: 'rpc',
      rpcUrl: 'https://bsc-dataseed.bnbchain.org',
      nativeCoingeckoId: 'binancecoin',
      tokens: [
        { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, coingeckoId: 'tether' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, coingeckoId: 'usd-coin' },
        { symbol: 'ETH', name: 'Binance-Peg Ether', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, coingeckoId: 'ethereum' },
        { symbol: 'BTCB', name: 'Binance-Peg BTC', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, coingeckoId: 'bitcoin' },
        { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, coingeckoId: 'pancakeswap-token' },
      ],
    },
  },
  {
    id: 'avalanche', name: 'Avalanche', family: 'evm',
    nativeSymbol: 'AVAX', nativeName: 'Avalanche', nativeDecimals: 18, color: '#E84142',
    provider: {
      kind: 'rpc',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      nativeCoingeckoId: 'avalanche-2',
      tokens: [
        { symbol: 'USDC', name: 'USD Coin', address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', decimals: 6, coingeckoId: 'usd-coin' },
        { symbol: 'USDT', name: 'Tether USD', address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', decimals: 6, coingeckoId: 'tether' },
        { symbol: 'WETH.e', name: 'Wrapped Ether', address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', decimals: 18, coingeckoId: 'weth' },
        { symbol: 'WBTC.e', name: 'Wrapped BTC', address: '0x50b7545627a5162F82A992c33b87aDc75187B218', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
      ],
    },
  },
]

export const SOLANA_CHAIN: ChainConfig = {
  id: 'solana', name: 'Solana', family: 'solana',
  nativeSymbol: 'SOL', nativeName: 'Solana', nativeDecimals: 9, color: '#9945FF',
}

export const BITCOIN_CHAIN: ChainConfig = {
  id: 'bitcoin', name: 'Bitcoin', family: 'bitcoin',
  nativeSymbol: 'BTC', nativeName: 'Bitcoin', nativeDecimals: 8, color: '#F7931A',
}

export const ALL_CHAINS: ChainConfig[] = [...EVM_CHAINS, SOLANA_CHAIN, BITCOIN_CHAIN]

export const chainById = (id: string): ChainConfig | undefined =>
  ALL_CHAINS.find((c) => c.id === id)

/** display order inside a wallet card */
export const chainOrder = (id: string): number => {
  const i = ALL_CHAINS.findIndex((c) => c.id === id)
  return i === -1 ? 999 : i
}

export const CASH_CURRENCIES = ['USD', 'IDR', 'SGD', 'EUR'] as const
