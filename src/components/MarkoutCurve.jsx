import { useState } from 'react'

// Markout decay curve: bps of notional at horizons +0 / +1m / +5m, per series.
// The drop from +0 to +5m is adverse selection; the gap between the green
// (bot-pool external) and slate (control external) lines is the bot's effect.
export default function MarkoutCurve({ curve }) {
  const [hover, setHover] = useState(null)
  const series = curve.filter((s) => s.points.every((p) => p.bps != null) && s.n > 0)
  if (!series.length) return <div className="chart-empty">No priced swaps in this window yet.</div>

  const W = 1000, H = 250, padL = 52, padR = 150, padT = 18, padB = 28
  const xCats = ['+0', '+1m', '+5m']
  const xLabels = ['immediate', '+1 min', '+5 min']
  const X = (i) => padL + (i / (xCats.length - 1)) * (W - padL - padR)
  const all = series.flatMap((s) => s.points.map((p) => p.bps)).concat([0])
  let minY = Math.min(...all), maxY = Math.max(...all)
  const pad = Math.max((maxY - minY) * 0.18, 0.4)
  minY -= pad; maxY += pad
  const Y = (v) => H - padB - ((v - minY) / (maxY - minY)) * (H - padT - padB)

  const yTicks = [maxY - pad * 0.4, 0, minY + pad * 0.4]

  // Snap the cursor to the nearest horizon column (+0 / +1m / +5m).
  // Map the pointer through the SVG CTM so it works regardless of how the
  // viewBox is letterboxed inside a wide container.
  const onMove = (e) => {
    const svg = e.currentTarget
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const vx = pt.matrixTransform(ctm.inverse()).x   // x in viewBox units
    let best = 0, bestD = Infinity
    xCats.forEach((_, i) => { const dd = Math.abs(X(i) - vx); if (dd < bestD) { bestD = dd; best = i } })
    setHover(best)
  }

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="250"
           onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)}
                  stroke={Math.abs(v) < 1e-9 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.07)'} strokeWidth="1" />
            <text x={padL - 7} y={Y(v) + 3.5} fill={Math.abs(v) < 1e-9 ? '#c2cbd8' : '#a0aec0'} fontSize="10.5" textAnchor="end">
              {Math.abs(v) < 1e-9 ? '0' : v.toFixed(1)}
            </text>
          </g>
        ))}
        {hover != null && (
          <line x1={X(hover)} x2={X(hover)} y1={padT} y2={H - padB}
                stroke="rgba(255,255,255,.16)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {xCats.map((c, i) => (
          <text key={c} x={X(i)} y={H - 8} fill={hover === i ? '#c2cbd8' : '#a0aec0'} fontSize="11" textAnchor="middle">{c}</text>
        ))}
        {series.map((s) => {
          const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.bps).toFixed(1)}`).join(' ')
          const last = s.points[s.points.length - 1]
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" />
              {s.points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.bps)} r={hover === i ? 4.5 : 3} fill={s.color} stroke={hover === i ? '#383e47' : 'none'} strokeWidth={hover === i ? 1.5 : 0} />)}
              <text x={X(2) + 9} y={Y(last.bps) + 3.5} fill={s.color} fontSize="10.5">{last.bps >= 0 ? '+' : ''}{last.bps.toFixed(2)}</text>
            </g>
          )
        })}
      </svg>
      <div className="chart-cap">
        {hover != null
          ? <><b style={{ color: 'var(--txt)' }}>{xLabels[hover]}</b> markout · {series.map((s, i) => (
              <span key={s.key}>{i ? ' · ' : ''}<span style={{ color: s.color }}>{s.label}</span> <b className="mono" style={{ color: s.color }}>{s.points[hover].bps >= 0 ? '+' : ''}{s.points[hover].bps.toFixed(2)}</b> bps</span>
            ))}</>
          : 'bps of notional at each horizon · hover a column (+0 / +1m / +5m) to inspect'}
      </div>
      <div className="mk-legend">
        {series.map((s) => (
          <span key={s.key}><i style={{ background: s.color }} />{s.label} <b className="muted">({s.n})</b></span>
        ))}
      </div>
    </div>
  )
}
