const fmt = (x, d = 2) => (x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(d))

// Tiny error-bar plot of Δ ± 95% CI around a zero line. If the bar crosses
// zero, the difference is within noise — shown visually, not just asserted.
function CIBar({ delta, deltaSE, scale }) {
  if (delta == null || deltaSE == null) return <div className="ci-bar" />
  const W = 220, H = 30, mid = W / 2
  const ci = 1.96 * deltaSE
  const X = (v) => mid + (v / scale) * (W / 2 - 8)
  const crossesZero = Math.abs(delta) <= ci
  const col = crossesZero ? 'var(--muted2)' : delta >= 0 ? 'var(--pos)' : 'var(--warn)'
  return (
    <svg className="ci-bar" viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none">
      <line x1={mid} x2={mid} y1="4" y2={H - 4} stroke="rgba(255,255,255,.22)" strokeWidth="1" />
      <line x1={X(delta - ci)} x2={X(delta + ci)} y1={H / 2} y2={H / 2} stroke={col} strokeWidth="2" />
      <line x1={X(delta - ci)} x2={X(delta - ci)} y1={H / 2 - 4} y2={H / 2 + 4} stroke={col} strokeWidth="2" />
      <line x1={X(delta + ci)} x2={X(delta + ci)} y1={H / 2 - 4} y2={H / 2 + 4} stroke={col} strokeWidth="2" />
      <circle cx={X(delta)} cy={H / 2} r="3.5" fill={col} />
    </svg>
  )
}

export default function ComparisonPanel({ comparisons }) {
  const valid = comparisons.filter((c) => c.delta != null)
  const scale = Math.max(0.5, ...valid.map((c) => Math.abs(c.delta) + 1.96 * c.deltaSE))

  return (
    <div className="card pad">
      <div className="ph flush">Bot pool vs control · markout at +5min
        <span className="right">same window · 95% CI · clustered by price-minute</span>
      </div>
      <div className="cmp">
        <div className="cmp-head">
          <span>Segment</span><span className="num">Bot pool</span><span className="num">Control</span>
          <span className="num">Δ (bps)</span><span className="cmp-ci">Δ ± 95% CI</span><span>Verdict</span>
        </div>
        {comparisons.map((c) => {
          const within = c.significant === false
          return (
            <div key={c.label} className="cmp-row">
              <span className="cmp-label">{c.label}</span>
              <span className="num mono">{fmt(c.treat.m5Bps)}</span>
              <span className="num mono">{fmt(c.ctrl.m5Bps)}</span>
              <span className="num mono" style={{ color: c.delta == null ? 'var(--muted2)' : within ? 'var(--muted2)' : c.delta >= 0 ? 'var(--pos)' : 'var(--warn)' }}>
                {fmt(c.delta)}{c.deltaSE != null && <span className="muted" style={{ fontSize: 11 }}> ±{(1.96 * c.deltaSE).toFixed(1)}</span>}
              </span>
              <span className="cmp-ci"><CIBar delta={c.delta} deltaSE={c.deltaSE} scale={scale} /></span>
              <span>
                {c.significant == null
                  ? <span className="tag">—</span>
                  : within
                    ? <span className="tag">within noise{c.sigma != null && ` · ${c.sigma.toFixed(1)}σ`}</span>
                    : <span className="tag reduced">significant · {c.sigma.toFixed(1)}σ</span>}
              </span>
            </div>
          )
        })}
      </div>
      <p className="caveat">
        Markout here is the <i>pool's</i> PnL — it shows the bot <i>extracting</i> LVR (so "Total pool" looks worse for
        the bot pool), but not the surplus the bot <i>returns</i> to LPs. Read alongside the LVR Bot dashboard for the
        full LP picture. At minute price resolution on a correlated pair, single-bps effects are below the noise floor —
        judge over months, not days.
      </p>
    </div>
  )
}
