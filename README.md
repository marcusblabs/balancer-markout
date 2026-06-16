# Markout · Balancer Toolkit

Per-swap **markout** — the market-making metric for liquidity-provision quality —
comparing the LVR fee-discount **bot pool** against an identical no-bot **control**
(cbBTC/WETH reCLAMM on Base). Part of the [Balancer Toolkit](https://marcusblabs.github.io/).

## What it measures

Markout marks each swap to the *fair price* a short time later. For a swap,
`markout(Δt)` = the pool's inventory change valued at the fair USD price (Dune
`prices.usd`, CEX-sourced) at Δt = 0 / +1min / +5min after the trade.

- **Positive** = the LP came out ahead (fee + favorable fill).
- The **decay from +0 to +5min** is adverse selection — toxic flow / LVR.
- Reported in **bps of notional** (markout per dollar traded) so segments compare.

Because both pools are the same pair, they share one reference price, so the
**differential** is near-pure signal. The headline: **external-flow markout, bot
pool vs control**. Higher on the bot pool ⇒ the bot keeps the price fresher, so
retail arrives less toxic and LPs do better — pool efficiency, measured directly.
The bot's *own* flow has negative markout by design (it extracts LVR) — but that
value is returned to LPs, so judge on external flow.

Reference: [CrocSwap — markout for LP profitability](https://crocswap.medium.com/usage-of-markout-to-calculate-lp-profitability-in-uniswap-v3-e32773b1a88e).

## Data

One public Dune query — [#7733210](https://dune.com/queries/7733210) — pulls every
swap on both pools from `balancer_v3_base.vault_evt_swap`, joins `prices.usd` at
each horizon, and classifies flow (bot vs external). Bring your own Dune key
(localStorage, sent only to dune.com).

## Develop

```bash
npm install
npm run dev      # http://localhost:3000  (#demo for sample data, no key)
npm run build
```

Deploys to GitHub Pages via Actions on push to `main`. `VITE_DUNE_QUERY_ID`
defaults to `7733210`.
