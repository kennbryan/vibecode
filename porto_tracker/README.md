# Vault — Local-First Net Worth Dashboard

A single-page app that tracks total net worth across **Crypto, Stocks, and Cash** — with every byte of data stored locally in your browser (IndexedDB). No backend, no accounts, no telemetry.

Dark "Obsidian" aesthetic: private-banking terminal, numbers-forward, one acid-lime accent.

## Features

- **Total net worth hero** in USD + IDR, with a single user-defined FX rate (inline-editable, instant re-render, count-up animation)
- **Crypto — paste any address (or many at once), no chain selection.** Address family is auto-detected (EVM / Solana / Bitcoin) and every supported chain is scanned in parallel. The Add-wallet box takes a whole list — one address per line — and validates each before adding:
  - EVM: Ethereum, Base, Arbitrum, Optimism, Polygon, Gnosis, zkSync Era, Scroll, Linea (Blockscout), BNB Chain, Avalanche (RPC + curated token list)
  - Solana (public RPC + Jupiter prices), Bitcoin (mempool.space)
  - Tron / Cosmos / TON / Sui / Aptos formats are detected and reported as not yet supported
- **Spam-proof totals (verified-token model).** Chain explorers return *every* token ever sent to an address — including airdropped spam that reports a fabricated price (a single fake "WHITE" token can claim $755,000). Counting those makes net worth meaningless. So Vault counts a token toward the total only if it is the chain's **native asset** or on the **verified token list** (`src/lib/tokenlist.ts`), and it **prices verified tokens from CoinGecko by id** — never from the explorer's untrustworthy `exchange_rate`. Everything else is collapsed into a "N tokens hidden as spam / unverified" row you can expand to inspect; those values are shown as unverified estimates and never added to your total. Add a token you actually hold by appending one line to the registry.
- **Stocks** — manual entry of US + IDX tickers; quotes via Yahoo Finance (IDX priced in IDR, converted with your FX rate); manual price override for illiquid holdings
- **Cash** — accounts in USD, IDR, SGD, EUR with user-defined cross rates (1:1 fallback is clearly flagged)
- **One allocation donut** — hover-dimming legend, nothing else chart-shaped anywhere
- **Settings drawer** — FX + cross rates, dust threshold, auto-refresh on load, JSON export/import (merge or replace), wipe-all
- Strict number formatting: full numbers with thousands separators everywhere, never abbreviated

## Privacy model

- 100% local storage (IndexedDB via Dexie). Closing the browser preserves everything; clearing site data wipes it cleanly.
- Outbound requests are **read-only, user-triggered** lookups to public price/balance APIs. The only data that ever leaves the device is the public address or ticker being queried.
- All APIs are keyless: Blockscout, public chain RPCs, mempool.space, Jupiter, CoinGecko, Frankfurter.
- One caveat, stated plainly: stock quotes route through a public CORS proxy (Yahoo doesn't serve CORS headers). The proxy sees ticker symbols only — never amounts. Prefer full isolation? Use manual prices.
- Export/import is the only other way data crosses the device boundary, and only on explicit action.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Dexie.js (IndexedDB) · Zustand · Recharts · Lucide · Geist Sans/Mono (bundled, no font CDN)

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

Deployable anywhere static files are served.

## Architecture notes

- `src/lib/formatters.ts` — the **only** place numbers are formatted (strict rules: USD 2dp, IDR 0dp `Rp`, crypto up to 8dp, no abbreviation)
- `src/lib/chains.ts` — config-driven chain registry; adding a chain is one entry
- `src/services/` — per-source fetchers + a refresh orchestrator; failures degrade per chain and never block the UI
- IDR is always derived at render time from USD × rate — changing the rate re-renders everything in one frame

## Out of scope (by design)

PnL, historical performance, tax reporting, NFTs, DeFi positions, staking, transaction history, alerts, news, watchlists, cloud sync.
