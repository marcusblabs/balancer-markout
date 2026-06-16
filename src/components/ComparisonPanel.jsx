const fmt = (x, d = 2) => (x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(d))

// Error-bar plot of Δ ± 95% CI around a zero line. Crosses zero → within noise.
function CIBar({ delta, se, scale }) {
  if (delta == null || se == null) return <div className="ci-bar" />
  const W = 220, H = 30, mid = W / 2
  const ci = 1.96 * se
  const X = (v) => mid + (v / scale) * (W / 2 - 8)
  const crossesZero = Math.abs(delta) <= ci
  const col = crossesZero ? 'var(--muted2)' : delta >= 0 ? 'var(--pos)' : 'var(--warn)'
  const tipText = `Δ ${fmt(delta)} ± ${ci.toFixed(2)} bps · 95% CI ${fmt(delta - ci)} to ${fmt(delta + ci)}` +
    (crossesZero ? ' · crosses zero (within noise)' : '')
  return (
    <svg className="ci-bar" viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="none">
      <title>{tipText}</title>
      <line x1={mid} x2={mid} y1="4" y2={H - 4} stroke="rgba(255,255,255,.22)" strokeWidth="1" />
      <line x1={X(delta - ci)} x2={X(delta + ci)} y1={H / 2} y2={H / 2} stroke={col} strokeWidth="2" />
      <line x1={X(delta - ci)} x2={X(delta - ci)} y1={H / 2 - 4} y2={H / 2 + 4} stroke={col} strokeWidth="2" />
      <line x1={X(delta + ci)} x2={X(delta + ci)} y1={H / 2 - 4} y2={H / 2 + 4} stroke={col} strokeWidth="2" />
      <circle cx={X(delta)} cy={H / 2} r="3.5" fill={col} />
    </svg>
  )
}

function verdict(p) {
  if (!p || p.significant == null) return <span className="tag">— (n={p?.n ?? 0})</span>
  return p.significant
    ? <span className="tag reduced">significant · {p.sigma.toFixed(1)}σ</span>
    : <span className="tag">within noise · {p.sigma.toFixed(1)}σ</span>
}

export default function ComparisonPanel({ comparisons }) {
  const valid = comparisons.filter((c) => c.paired?.delta != null)
  const scale = Math.max(0.5, ...valid.map((c) => Math.abs(c.paired.delta) + 1.96 * c.paired.se))

  return (
    <div className="card pad">
      <div className="ph flush">Bot pool vs control · markout at +5min
        <span className="right">matched-minute · 95% CI · drift-cancelled</span>
      </div>
      <div className="cmp">
        <div className="cmp-head">
          <span>Segment</span><span className="num">Bot pool</span><span className="num">Control</span>
          <span className="num">Paired Δ</span><span className="cmp-ci">Δ ± 95% CI</span><span>Verdict</span>
        </div>
        {comparisons.map((c) => {
          const p = c.paired
          const within = p?.significant === false
          const dcol = !p || p.delta == null ? 'var(--muted2)' : within ? 'var(--muted2)' : p.delta >= 0 ? 'var(--pos)' : 'var(--warn)'
          return (
            <div key={c.label} className="cmp-row">
              <span className="cmp-label">{c.label}</span>
              <span className="num mono">{fmt(c.treat.m5Bps)}</span>
              <span className="num mono">{fmt(c.ctrl.m5Bps)}</span>
              <span className="num mono" style={{ color: dcol }}>
                {fmt(p?.delta)}{p?.se != null && <span className="muted" style={{ fontSize: 11 }}> ±{(1.96 * p.se).toFixed(1)}</span>}
              </span>
              <span className="cmp-ci"><CIBar delta={p?.delta} se={p?.se} scale={scale} /></span>
              <span>{verdict(p)}</span>
            </div>
          )
        })}
      </div>
      <p className="caveat">
        <b style={{ color: 'var(--muted2)' }}>Paired Δ</b> compares the two pools <i>in the same minutes</i>, so the shared
        BTC/ETH drift (the dominant noise) cancels — the right test for two pools holding identical assets. The naive
        window-mean difference is ~3× noisier and reads as within-noise. Markout here is the <i>pool's</i> PnL: it shows
        the bot <i>extracting</i> LVR (so "Total pool" looks worse for the bot pool) but not the surplus it <i>returns</i> —
        read with the LVR Bot dashboard. Borderline (~2σ) signals still need more weeks to confirm.
      </p>
    </div>
  )
}
