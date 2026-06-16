// Pure transforms for the markout interface. Exported for unit testing.
//
// Markout(Δt) per swap = pool inventory delta valued at the fair USD price
// (prices.usd) at horizon Δt. Positive = LP favorable; the decay from +0 to
// +5min is adverse selection.
//
// Truthfulness guarantees baked in here:
//  • SAME-WINDOW: the bot pool is only compared against the control over the
//    period both pools are live (the control was deployed later). Comparing the
//    bot pool's longer, more volatile history was a period-mismatch bug.
//  • UNCERTAINTY: per-swap markout on a correlated pair at minute price
//    resolution is very noisy (~tens of bps/swap, dominated by genuine 5-min
//    BTC/ETH drift). We cluster by minute (price episode) and report standard
//    errors + 95% CIs, so a within-noise difference is shown as within noise.

import { RETAIL_MAX_USD } from '../config'

const n = (v) => (v == null ? 0 : Number(v))
const DAY_MS = 86_400_000

export function parseTs(ts) {
  if (!ts) return 0
  const d = new Date(String(ts).replace(' ', 'T').replace(' UTC', 'Z'))
  return isNaN(d) ? 0 : d.getTime()
}

export function normalizeRows(rows) {
  return rows
    .filter((r) => r.tx_hash && r.markout_0 != null && r.markout_1m != null && r.markout_5m != null && r.notional_usd != null)
    .map((r) => ({
      time: r.block_time || null,
      timeMs: parseTs(r.block_time),
      minute: (r.block_time || '').slice(0, 16), // YYYY-MM-DD HH:MM — the price episode
      txHash: r.tx_hash,
      pool: r.pool_label, // 'treatment' | 'control'
      flow: r.flow, // 'bot' | 'external'
      notionalUsd: n(r.notional_usd),
      m0: n(r.markout_0),
      m1: n(r.markout_1m),
      m5: n(r.markout_5m),
    }))
    .sort((a, b) => b.timeMs - a.timeMs)
}

// Volume-weighted mean markout (USD→bps) plus an episode-clustered standard
// error: cluster swaps by minute, weight episodes by their volume.
function groupStats(rows) {
  if (!rows.length) return { n: 0, volumeUsd: 0, m0Bps: null, m1Bps: null, m5Bps: null, se: null, lo: null, hi: null, episodes: 0 }
  const vol = rows.reduce((a, x) => a + x.notionalUsd, 0)
  const sum = (k) => rows.reduce((a, x) => a + x[k], 0)
  const bps = (s) => (vol > 0 ? (s / vol) * 10000 : null)

  const byMin = new Map()
  for (const x of rows) {
    const e = byMin.get(x.minute) || { m5: 0, w: 0 }
    e.m5 += x.m5; e.w += x.notionalUsd; byMin.set(x.minute, e)
  }
  const eps = [...byMin.values()].filter((e) => e.w > 0).map((e) => ({ bps: (e.m5 / e.w) * 10000, w: e.w }))
  const W = eps.reduce((a, e) => a + e.w, 0)
  const mean = W > 0 ? eps.reduce((a, e) => a + e.bps * e.w, 0) / W : null
  const sumW2 = eps.reduce((a, e) => a + e.w * e.w, 0)
  const neff = sumW2 > 0 ? (W * W) / sumW2 : 0
  const varW = W > 0 ? eps.reduce((a, e) => a + e.w * (e.bps - mean) ** 2, 0) / W : 0
  const se = neff > 1 ? Math.sqrt(varW / neff) : null

  return {
    n: rows.length, volumeUsd: vol,
    m0Bps: bps(sum('m0')), m1Bps: bps(sum('m1')), m5Bps: bps(sum('m5')),
    m5Usd: sum('m5'),
    se, lo: se != null ? mean - 1.96 * se : null, hi: se != null ? mean + 1.96 * se : null,
    episodes: eps.length,
  }
}

// Per-minute volume-weighted markout bps, keyed by price-minute.
function perMinuteBps(rows) {
  const m = new Map()
  for (const x of rows) {
    const e = m.get(x.minute) || { m5: 0, w: 0 }
    e.m5 += x.m5; e.w += x.notionalUsd; m.set(x.minute, e)
  }
  const o = new Map()
  for (const [k, e] of m) if (e.w > 0) o.set(k, (e.m5 / e.w) * 10000)
  return o
}

// Paired (matched-minute) differential: in minutes where BOTH pools have this
// flow, the shared BTC/ETH 5-min drift cancels, leaving the bot's effect. This
// is the correct differential for two pools holding identical assets — it slashes
// the variance vs comparing window means.
function pairedDiff(treatRows, ctrlRows) {
  const T = perMinuteBps(treatRows), C = perMinuteBps(ctrlRows)
  const diffs = []
  for (const [k, v] of T) if (C.has(k)) diffs.push(v - C.get(k))
  if (diffs.length < 8) return { n: diffs.length, delta: null, se: null, sigma: null, significant: null }
  const mean = diffs.reduce((a, x) => a + x, 0) / diffs.length
  const sd = Math.sqrt(diffs.reduce((a, x) => a + (x - mean) ** 2, 0) / (diffs.length - 1))
  const se = sd / Math.sqrt(diffs.length)
  return { n: diffs.length, delta: mean, se, sigma: se > 0 ? Math.abs(mean) / se : null, significant: se > 0 ? Math.abs(mean) > 1.96 * se : null }
}

function compare(windowed, label, filterFn) {
  const treatRows = windowed.filter((s) => s.pool === 'treatment' && filterFn(s))
  const ctrlRows = windowed.filter((s) => s.pool === 'control' && filterFn(s))
  const treat = groupStats(treatRows)
  const ctrl = groupStats(ctrlRows)
  // Unpaired (window-mean) differential — naive, noisy.
  let delta = null, deltaSE = null
  if (treat.m5Bps != null && ctrl.m5Bps != null && treat.se != null && ctrl.se != null) {
    delta = treat.m5Bps - ctrl.m5Bps
    deltaSE = Math.sqrt(treat.se ** 2 + ctrl.se ** 2)
  }
  // Paired (matched-minute) differential — the headline test.
  const paired = pairedDiff(treatRows, ctrlRows)
  return { label, treat, ctrl, delta, deltaSE, paired }
}

export function inWindow(swaps, days, nowMs) {
  if (!days) return swaps
  const cutoff = nowMs - days * DAY_MS
  return swaps.filter((s) => s.timeMs >= cutoff)
}

export function computeMarkout(swaps, periodDays, nowMs) {
  // Same-window clamp: only compare where BOTH pools exist (control starts later).
  const ctrlTimes = swaps.filter((s) => s.pool === 'control').map((s) => s.timeMs)
  const overlapStart = ctrlTimes.length ? Math.min(...ctrlTimes) : 0
  const w = inWindow(swaps, periodDays, nowMs).filter((s) => s.timeMs >= overlapStart)
  const overlapDays = w.length ? (Math.max(...w.map((s) => s.timeMs)) - overlapStart) / DAY_MS : 0

  const groups = {
    treatExt: groupStats(w.filter((s) => s.pool === 'treatment' && s.flow === 'external')),
    treatBot: groupStats(w.filter((s) => s.pool === 'treatment' && s.flow === 'bot')),
    ctrlExt: groupStats(w.filter((s) => s.pool === 'control' && s.flow === 'external')),
  }

  const comparisons = [
    compare(w, 'Total pool', () => true),
    compare(w, 'External flow', (s) => s.flow === 'external'),
    compare(w, `Retail (<$${RETAIL_MAX_USD})`, (s) => s.flow === 'external' && s.notionalUsd < RETAIL_MAX_USD),
  ]

  const curveOf = (g) => [
    { h: 0, label: '+0', bps: g.m0Bps },
    { h: 1, label: '+1m', bps: g.m1Bps },
    { h: 5, label: '+5m', bps: g.m5Bps },
  ]
  const curve = [
    { key: 'treatExt', label: 'Bot pool · external', color: '#63f2be', points: curveOf(groups.treatExt), n: groups.treatExt.n },
    { key: 'ctrlExt', label: 'Control · external', color: '#8b97ac', points: curveOf(groups.ctrlExt), n: groups.ctrlExt.n },
    { key: 'treatBot', label: 'Bot pool · bot (arb)', color: '#7f6ae8', points: curveOf(groups.treatBot), n: groups.treatBot.n },
  ]

  return { groups, comparisons, curve, swaps: w, overlapStart, overlapDays, periodDays }
}
