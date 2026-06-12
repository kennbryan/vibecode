/**
 * tokenlist.ts — verified-token registry.
 *
 * Chain explorers return every token ever sent to an address, including
 * airdropped spam with fabricated prices (a fake "WHITE" token can report a
 * non-zero exchange rate and inflate a total by six figures). Counting those
 * makes the net-worth number meaningless.
 *
 * So Vault counts a token toward the total only if it is one of:
 *   1. the chain's native asset (always), or
 *   2. a contract on this verified list.
 *
 * Everything else is shown as "hidden as spam" (collapsible) and valued at $0.
 * Prices for verified tokens come from CoinGecko by id — never from the
 * explorer's exchange_rate, which is unreliable for illiquid/spam tokens.
 *
 * Keyed by `${chainId}:${contractAddress.toLowerCase()}`. Adding a token you
 * actually hold is one line here.
 */

export interface VerifiedToken {
  coingeckoId: string
  /** canonical symbol override (explorers sometimes return junk symbols) */
  symbol?: string
}

/** native coingecko id per chain — used to price the base asset */
export const NATIVE_COINGECKO: Record<string, string> = {
  ethereum: 'ethereum',
  base: 'ethereum',
  arbitrum: 'ethereum',
  optimism: 'ethereum',
  polygon: 'polygon-ecosystem-token',
  gnosis: 'xdai',
  zksync: 'ethereum',
  scroll: 'ethereum',
  linea: 'ethereum',
  bnb: 'binancecoin',
  avalanche: 'avalanche-2',
  solana: 'solana',
  bitcoin: 'bitcoin',
}

/* common ids reused across chains */
const USDC = 'usd-coin'
const USDT = 'tether'
const WBTC = 'wrapped-bitcoin'
const WETH = 'weth'
const DAI = 'dai'

/**
 * Verified ERC-20 / SPL contracts. Lowercased addresses.
 * Curated to the assets most personal portfolios actually hold; extend freely.
 */
const RAW: Record<string, Record<string, VerifiedToken>> = {
  ethereum: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { coingeckoId: USDC, symbol: 'USDC' },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { coingeckoId: USDT, symbol: 'USDT' },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { coingeckoId: DAI, symbol: 'DAI' },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { coingeckoId: WBTC, symbol: 'WBTC' },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { coingeckoId: WETH, symbol: 'WETH' },
    '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': { coingeckoId: 'staked-ether', symbol: 'stETH' },
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': { coingeckoId: 'wrapped-steth', symbol: 'wstETH' },
    '0x83f20f44975d03b1b09e64809b757c47f942beea': { coingeckoId: 'savings-dai', symbol: 'sDAI' },
    '0x4c9edd5852cd905f086c759e8383e09bff1e68b3': { coingeckoId: 'ethena-usde', symbol: 'USDe' },
    '0x6c3ea9036406852006290770bedfcaba0e23a0e8': { coingeckoId: 'paypal-usd', symbol: 'PYUSD' },
    '0x853d955acef822db058eb8505911ed77f175b99e': { coingeckoId: 'frax', symbol: 'FRAX' },
    '0x514910771af9ca656af840dff83e8264ecf986ca': { coingeckoId: 'chainlink', symbol: 'LINK' },
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { coingeckoId: 'uniswap', symbol: 'UNI' },
    '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': { coingeckoId: 'matic-network', symbol: 'MATIC' },
    '0x6982508145454ce325ddbe47a25d4ec3d2311933': { coingeckoId: 'pepe', symbol: 'PEPE' },
    '0xc944e90c64b2c07662a292be6244bdf05cda44a7': { coingeckoId: 'the-graph', symbol: 'GRT' },
    '0x163f8c2467924be0ae7b5347228cabf260318753': { coingeckoId: 'worldcoin-wld', symbol: 'WLD' },
    '0x912ce59144191c1204e64559fe8253a0e49e6548': { coingeckoId: 'arbitrum', symbol: 'ARB' },
    '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': { coingeckoId: 'maker', symbol: 'MKR' },
    '0xd533a949740bb3306d119cc777fa900ba034cd52': { coingeckoId: 'curve-dao-token', symbol: 'CRV' },
    '0xba100000625a3754423978a60c9317c58a424e3d': { coingeckoId: 'balancer', symbol: 'BAL' },
    '0x5a98fcbea516cf06857215779fd812ca3bef1b32': { coingeckoId: 'lido-dao', symbol: 'LDO' },
    '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': { coingeckoId: 'ethereum-name-service', symbol: 'ENS' },
    '0x68749665ff8d2d112fa859aa293f07a622782f38': { coingeckoId: 'tether-gold', symbol: 'XAUt' },
    '0x45804880de22913dafe09f4980848ece6ecbaf78': { coingeckoId: 'pax-gold', symbol: 'PAXG' },
    '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { coingeckoId: 'coinbase-wrapped-btc', symbol: 'cbBTC' },
  },
  base: {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { coingeckoId: USDC, symbol: 'USDC' },
    '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': { coingeckoId: USDC, symbol: 'USDbC' },
    '0x4200000000000000000000000000000000000006': { coingeckoId: WETH, symbol: 'WETH' },
    '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': { coingeckoId: 'coinbase-wrapped-btc', symbol: 'cbBTC' },
    '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': { coingeckoId: 'dai', symbol: 'DAI' },
    '0x2416092f143378750bb29b79ed961ab195cceea5': { coingeckoId: 'renzo-restaked-eth', symbol: 'ezETH' },
    '0x940181a94a35a4569e4529a3cdfb74e38fd98631': { coingeckoId: 'aerodrome-finance', symbol: 'AERO' },
  },
  arbitrum: {
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { coingeckoId: USDC, symbol: 'USDC' },
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': { coingeckoId: USDC, symbol: 'USDC.e' },
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { coingeckoId: USDT, symbol: 'USDT' },
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { coingeckoId: WETH, symbol: 'WETH' },
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': { coingeckoId: WBTC, symbol: 'WBTC' },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { coingeckoId: DAI, symbol: 'DAI' },
    '0x912ce59144191c1204e64559fe8253a0e49e6548': { coingeckoId: 'arbitrum', symbol: 'ARB' },
    '0x5979d7b546e38e414f7e9822514be443a4800529': { coingeckoId: 'wrapped-steth', symbol: 'wstETH' },
    '0x6c2c06790b3e3e3c38e12ee22f8183b37a13ee55': { coingeckoId: 'dopex-rebate-token', symbol: 'DPX' },
  },
  optimism: {
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { coingeckoId: USDC, symbol: 'USDC' },
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': { coingeckoId: USDC, symbol: 'USDC.e' },
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': { coingeckoId: USDT, symbol: 'USDT' },
    '0x4200000000000000000000000000000000000006': { coingeckoId: WETH, symbol: 'WETH' },
    '0x68f180fcce6836688e9084f035309e29bf0a2095': { coingeckoId: WBTC, symbol: 'WBTC' },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': { coingeckoId: DAI, symbol: 'DAI' },
    '0x4200000000000000000000000000000000000042': { coingeckoId: 'optimism', symbol: 'OP' },
    '0x1f32b1c2345538c0c6f582fcb022739c4a194ebb': { coingeckoId: 'wrapped-steth', symbol: 'wstETH' },
  },
  polygon: {
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { coingeckoId: USDC, symbol: 'USDC' },
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': { coingeckoId: USDC, symbol: 'USDC.e' },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { coingeckoId: USDT, symbol: 'USDT' },
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { coingeckoId: WETH, symbol: 'WETH' },
    '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': { coingeckoId: WBTC, symbol: 'WBTC' },
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': { coingeckoId: DAI, symbol: 'DAI' },
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': { coingeckoId: 'wmatic', symbol: 'WMATIC' },
  },
  gnosis: {
    '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83': { coingeckoId: USDC, symbol: 'USDC' },
    '0x4ecaba5870353805a9f068101a40e0f32ed605c6': { coingeckoId: USDT, symbol: 'USDT' },
    '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1': { coingeckoId: WETH, symbol: 'WETH' },
    '0x8e5bbbb09ed1ebde8674cda39a0c169401db4252': { coingeckoId: WBTC, symbol: 'WBTC' },
    '0xaf204776c7245bf4147c2612bf6e5972ee483701': { coingeckoId: 'savings-dai', symbol: 'sDAI' },
  },
  zksync: {
    '0x1d17cbcf0d6d143135ae902365d2e5e2a16538d4': { coingeckoId: USDC, symbol: 'USDC' },
    '0x493257fd37edb34451f62edf8d2a0c418852ba4c': { coingeckoId: USDT, symbol: 'USDT' },
    '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91': { coingeckoId: WETH, symbol: 'WETH' },
  },
  scroll: {
    '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4': { coingeckoId: USDC, symbol: 'USDC' },
    '0xf55bec9cafdbe8730f096aa55dad6d22d44099df': { coingeckoId: USDT, symbol: 'USDT' },
    '0x5300000000000000000000000000000000000004': { coingeckoId: WETH, symbol: 'WETH' },
  },
  linea: {
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff': { coingeckoId: USDC, symbol: 'USDC' },
    '0xa219439258ca9da29e9cc4ce5596924745e12b93': { coingeckoId: USDT, symbol: 'USDT' },
    '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f': { coingeckoId: WETH, symbol: 'WETH' },
  },
  bnb: {
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { coingeckoId: USDC, symbol: 'USDC' },
    '0x55d398326f99059ff775485246999027b3197955': { coingeckoId: USDT, symbol: 'USDT' },
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8': { coingeckoId: 'ethereum', symbol: 'ETH' },
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': { coingeckoId: 'bitcoin', symbol: 'BTCB' },
    '0xe9e7cea3dedca5984780bafc599bd69add087d56': { coingeckoId: 'binance-usd', symbol: 'BUSD' },
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': { coingeckoId: 'pancakeswap-token', symbol: 'CAKE' },
  },
  avalanche: {
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': { coingeckoId: USDC, symbol: 'USDC' },
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': { coingeckoId: USDT, symbol: 'USDT' },
    '0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab': { coingeckoId: WETH, symbol: 'WETH.e' },
    '0x50b7545627a5162f82a992c33b87adc75187b218': { coingeckoId: WBTC, symbol: 'WBTC.e' },
  },
  // Solana mints are case-sensitive base58; we lowercase the KEY for lookup
  // and lowercase the holding's mint the same way before matching.
  solana: {
    'epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v': { coingeckoId: USDC, symbol: 'USDC' },
    'es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb': { coingeckoId: USDT, symbol: 'USDT' },
    'jupyiwryjfskupiha7hker8vutaefosybkedznsdvcn': { coingeckoId: 'jupiter-exchange-solana', symbol: 'JUP' },
    'msolzycxhdygdzu16g5qsh3i5k3z3kzk7ytfqcjm7so': { coingeckoId: 'msol', symbol: 'mSOL' },
    'j1toso1uck3rlmjorhttrvwy9hj7x8v9yyac6y7kgcpn': { coingeckoId: 'jito-staked-sol', symbol: 'jitoSOL' },
    '7vfcxtuxx5wjv5jadk17duj4ksgau7utnkj4b963voxs': { coingeckoId: 'ethereum', symbol: 'ETH' },
    '4k3dyjzvzp8emzwuxbbcjevwskkk59s5icnly3qrkx6r': { coingeckoId: 'raydium', symbol: 'RAY' },
    'dezxakqsgbpetfvfa1amtqsmgbdyfsxqasknsm4ufjwb': { coingeckoId: 'bonk', symbol: 'BONK' },
  },
}

/** lookups (addresses already lowercased in RAW) */
export function verifiedToken(chainId: string, contract: string | null): VerifiedToken | null {
  if (!contract) return null
  return RAW[chainId]?.[contract.toLowerCase()] ?? null
}

/** every coingecko id referenced — for a single batched price call */
export function allCoingeckoIds(): string[] {
  const ids = new Set<string>(Object.values(NATIVE_COINGECKO))
  for (const chain of Object.values(RAW)) {
    for (const tok of Object.values(chain)) ids.add(tok.coingeckoId)
  }
  return [...ids]
}
