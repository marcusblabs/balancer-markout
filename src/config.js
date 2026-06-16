// Static config for the Markout interface.
//
// Markout = LP PnL on a swap, marked to the fair price (prices.usd, CEX-sourced)
// at 0 / +1min / +5min after the trade. Positive = LP favorable; the decay from
// +0 to +5min is adverse selection (toxic flow / LVR). Comparing the bot pool
// (treatment) to an identical no-bot control isolates the bot's effect on how
// toxic the *external* flow is when it arrives.

function normalizeQueryId(value) {
  if (!value) return ''
  const raw = String(value).trim()
  const urlMatch = raw.match(/\/queries\/(\d+)(?:\/|$)/i)
  return urlMatch ? urlMatch[1] : raw
}

// Saved Dune query — https://dune.com/queries/7733210
export const DUNE_QUERY_ID = normalizeQueryId(import.meta.env.VITE_DUNE_QUERY_ID) || '7733210'

export const TREATMENT_POOL = '0xbd2badea936b84692a116582cf9a993cdaaf6d81'
export const CONTROL_POOL = '0x1f4bd213d23cdc46a23b77606a184f0303637c53'
export const BOT_ADDRESS = '0xb48a7952524c8dfc5b54695edb555507884f10b5'

// Swaps below this notional are treated as "retail" for the like-for-like
// comparison (vs larger flow that is mostly arbitrage).
export const RETAIL_MAX_USD = 100

export const PERIODS = [
  { key: '24h', label: '24h', days: 1 },
  { key: '7d', label: '7d', days: 7 },
  { key: '30d', label: '30d', days: 30 },
  { key: 'all', label: 'All', days: null },
]
export const DEFAULT_PERIOD = 'all'

export const EXPLORER_TX = (h) => `https://basescan.org/tx/${h}`
export const BALANCER_POOL_URL = (a) => `https://balancer.fi/pools/base/v3/${a}`
