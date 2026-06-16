// Small formatting helpers.

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

// APR given as a fraction (0.006 -> "0.60%"). null -> em dash.
export function aprPct(frac) {
  if (frac == null || !isFinite(frac)) return '—'
  return (frac * 100).toFixed(2) + '%'
}

// APR given as a fraction -> basis points ("60 bps").
export function bps(frac) {
  if (frac == null || !isFinite(frac)) return '—'
  return Math.round(frac * 10000).toLocaleString('en-US') + ' bps'
}

// A signed ratio like discount efficiency (1.2 -> "1.2×"). null -> em dash.
export function multiple(x) {
  if (x == null || !isFinite(x)) return '—'
  return x.toFixed(2) + '×'
}

// Signed percent for drift (0.05 -> "+5.0%", -0.03 -> "−3.0%"). null -> ''.
export function signedPct(frac) {
  if (frac == null || !isFinite(frac)) return ''
  const v = frac * 100
  const s = (Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0))
  return (v >= 0 ? '+' : '−') + Math.abs(s) + '%'
}

// Price like "$2,015/ETH". null -> '—'.
export function price(p, unit) {
  if (p == null || !isFinite(p)) return '—'
  const s = p >= 100 ? p.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : p >= 1 ? p.toFixed(2) : p.toPrecision(3)
  return '$' + s + (unit ? `/${unit}` : '')
}

export function usd(n) {
  const v = Number(n) || 0
  if (v === 0) return '$0.00'
  if (Math.abs(v) < 0.01) return '$' + v.toFixed(4)
  if (Math.abs(v) < 1000) return '$' + v.toFixed(2)
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function token(n, symbol) {
  const v = Number(n) || 0
  let s
  if (v === 0) s = '0'
  else if (Math.abs(v) < 0.0001) s = v.toExponential(3)
  else if (Math.abs(v) < 1) s = v.toPrecision(4)
  else s = v.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return symbol ? `${s} ${symbol}` : s
}

export function pct(n) {
  const v = Number(n) || 0
  return (v * 100).toFixed(v * 100 < 0.1 ? 3 : 2) + '%'
}

// Swap-fee rate with an extra decimal so e.g. 0.285% vs 0.300% is legible.
export function feePct(frac) {
  if (frac == null || !isFinite(frac)) return '—'
  return (frac * 100).toFixed(3) + '%'
}

export function compactNum(n) {
  const v = Number(n) || 0
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const fmtDateTime = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
})

export function when(ts) {
  if (!ts) return '—'
  const d = new Date(ts.replace(' ', 'T').replace(' UTC', 'Z'))
  if (isNaN(d)) return ts
  return fmtDateTime.format(d)
}

export function relative(ts) {
  if (!ts) return ''
  const d = new Date(ts.replace(' ', 'T').replace(' UTC', 'Z'))
  if (isNaN(d)) return ''
  const secs = (Date.now() - d.getTime()) / 1000
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}
