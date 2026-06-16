import { useState } from 'react'

const DEFS = [
  ['Markout', "An LP-profitability metric from market-making: mark each swap to the fair price a short time later. For a swap, markout(Δt) = the pool's inventory change valued at the fair USD price Δt after the trade. Positive = the LP came out ahead (fee + favorable fill); negative = adverse selection (the pool was picked off)."],
  ['Reference price', 'prices.usd (CEX-sourced fair price), minute resolution. Both tokens are valued in USD, so the cbBTC/WETH cross is the external fair reference — not the pool\'s own (potentially stale) price.'],
  ['Horizons +0 / +1m / +5m', 'Markout right after the trade, then 1 and 5 minutes later. The decay from +0 to +5m is the adverse-selection cost. ~5 min is the market-microstructure standard (effects mostly settled); longer windows just measure price drift, not flow quality.'],
  ['bps of notional', 'Markout USD ÷ swap notional × 10,000 — markout per dollar traded, so pools and segments of different size compare directly.'],
  ['External vs bot flow', 'External = retail / third-party arbitrageurs. Bot = the fee-discount LVR bot. The bot\'s own markout is negative by design (it extracts the pool\'s LVR) — but that value is returned to LPs, so judge the pool on its EXTERNAL-flow markout.'],
  ['The comparison', 'Both pools are identical cbBTC/WETH reCLAMM pools, so they share one reference price. The hypothesis: if the bot keeps the price fresher, external/retail flow arrives less toxic and the bot pool shows higher external-flow markout. We test it same-window with confidence intervals rather than asserting it.'],
  ['Same window only', 'The control was deployed after the bot pool, so the comparison is clamped to the period BOTH pools are live — otherwise the bot pool\'s longer, more volatile history (e.g. the Saylor BTC move) biases the result.'],
  ['The noise floor', 'Per-swap markout on a correlated pair at minute resolution is dominated by genuine 5-min BTC/ETH drift — ~tens of bps per swap. (Confirmed: switching the reference to deep Ethereum-mainnet prices did not reduce it — it is real price movement, not feed quality.)'],
  ['Paired (matched-minute) Δ', 'The fix: both pools hold the same assets, so in any given minute they face the SAME drift. Comparing them within the same minute cancels that shared drift, cutting the noise ~3×. This is the headline test; the naive window-mean difference is far noisier and understates significance. Method inspired by an earlier reCLAMM markout query.'],
]

export default function Methodology() {
  const [open, setOpen] = useState(false)
  return (
    <div className="card defs">
      <div className="ph" style={{ cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        Methodology &amp; definitions <span className="right">{open ? 'hide ▾' : 'show ▸'}</span>
      </div>
      {open && (
        <div className="defs-body">
          <dl>{DEFS.map(([t, d]) => (<div key={t} className="def"><dt>{t}</dt><dd>{d}</dd></div>))}</dl>
          <p className="caveat">
            One caveat: protocol fee cut (25%) and gas aren't netted from these markout numbers — both pools share the
            same cut so it cancels in the comparison, but absolute LP markout is ~75% of the fee component shown.
            Sign convention here: positive markout = LP favorable. Sample sizes are small per day — judge cumulative weeks.
          </p>
        </div>
      )}
    </div>
  )
}
