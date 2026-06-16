// Pure transforms for the markout interface. Exported for unit testing
// (scripts/smoke.mjs) against real Dune rows.
//
// Markout(Δt) per swap = pool inventory delta valued at the fair USD price
// (prices.usd) at horizon Δt. Positive = LP came out ahead (fee + favorable
// fill); the decay from +0 to +5min is adverse selection / toxic flow.
// Reported as USD and as bps of notional (markout per dollar traded).

const n = (v) => (v == null ? 0 : Number(v))
const DAY_MS = 86_400_000

export function parseTs(ts) {
  if (!ts) return 0
  const d = new Date(String(ts).replace(' ', 'T').replace(' UTC', 'Z'))
  return isNaN(d) ? 0 : d.getTime()
}

export function normalizeRows(rows) {
  return rows
    // need a valid reference price at every horizon to be in the markout set
    .filter((r) => r.tx_hash && r.markout_0 != null && r.markout_1m != null && r.markout_5m != null && r.notional_usd != null)
    .map((r) => ({
      time: r.block_time || null,
      timeMs: parseTs(r.block_time),
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

export function inWindow(swaps, days, nowMs) {
  if (!days) return swaps
  const cutoff = nowMs - days * DAY_MS
  return swaps.filter((s) => s.timeMs >= cutoff)
}

function rollGroup(list) {
  let vol = 0, m0 = 0, m1 = 0, m5 = 0
  for (const s of list) { vol += s.notionalUsd; m0 += s.m0; m1 += s.m1; m5 += s.m5 }
  const bps = (m) => (vol > 0 ? (m / vol) * 10000 : null)
  return {
    n: list.length, volumeUsd: vol,
    m0Usd: m0, m1Usd: m1, m5Usd: m5,
    m0Bps: bps(m0), m1Bps: bps(m1), m5Bps: bps(m5),
  }
}

/**
 * Compute the full markout view for a window.
 * Returns { groups, pools, headline, curve, swaps }.
 */
export function computeMarkout(swaps, periodDays, nowMs) {
  const w = inWindow(swaps, periodDays, nowMs)
  const sub = (pool, flow) => w.filter((s) => s.pool === pool && (flow ? s.flow === flow : true))

  const groups = {
    treatExt: rollGroup(sub('treatment', 'external')),
    treatBot: rollGroup(sub('treatment', 'bot')),
    ctrlExt: rollGroup(sub('control', 'external')),
    ctrlBot: rollGroup(sub('control', 'bot')),
  }
  const pools = {
    treatment: rollGroup(sub('treatment')),
    control: rollGroup(sub('control')),
  }

  const extTreatBps = groups.treatExt.m5Bps
  const extCtrlBps = groups.ctrlExt.m5Bps
  const deltaBps =
    extTreatBps != null && extCtrlBps != null ? extTreatBps - extCtrlBps : null

  // Markout curve: bps at horizons 0 / 1m / 5m for the three meaningful series.
  const curveOf = (g) => [
    { h: 0, label: '+0', bps: g.m0Bps },
    { h: 1, label: '+1m', bps: g.m1Bps },
    { h: 5, label: '+5m', bps: g.m5Bps },
  ]
  const curve = [
    { key: 'treatExt', label: 'Bot pool · external flow', color: '#63f2be', points: curveOf(groups.treatExt), n: groups.treatExt.n },
    { key: 'ctrlExt', label: 'Control · external flow', color: '#8b97ac', points: curveOf(groups.ctrlExt), n: groups.ctrlExt.n },
    { key: 'treatBot', label: 'Bot pool · bot (arb) flow', color: '#7f6ae8', points: curveOf(groups.treatBot), n: groups.treatBot.n },
  ]

  return {
    groups, pools, curve, swaps: w,
    headline: { extTreatBps, extCtrlBps, deltaBps },
    periodDays,
  }
}
