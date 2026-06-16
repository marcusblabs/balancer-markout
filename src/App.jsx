import { useCallback, useEffect, useMemo, useState } from 'react'
import { DUNE_QUERY_ID, PERIODS, DEFAULT_PERIOD, TREATMENT_POOL, CONTROL_POOL, BALANCER_POOL_URL } from './config'
import { getDuneApiKey } from './lib/duneApiKey'
import { getLatestResults, executeAndPoll } from './lib/dune'
import { normalizeRows, computeMarkout } from './lib/markout'
import { when, relative, compactNum } from './lib/format'
import ApiKeyPanel from './components/ApiKeyPanel'
import PeriodSelector from './components/PeriodSelector'
import ComparisonPanel from './components/ComparisonPanel'
import MarkoutCurve from './components/MarkoutCurve'
import FlowTable from './components/FlowTable'
import SwapsTable from './components/SwapsTable'
import Methodology from './components/Methodology'

const fmtBps = (x, d = 2) => (x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(d) + ' bps')

export default function App() {
  const [hasKey, setHasKey] = useState(() => !!getDuneApiKey())
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [swaps, setSwaps] = useState([])
  const [executedAt, setExecutedAt] = useState(null)
  const [period, setPeriod] = useState(DEFAULT_PERIOD)

  const load = useCallback(async (fresh = false) => {
    if (!getDuneApiKey()) return
    setError('')
    setStatus(fresh ? 'executing' : 'loading')
    try {
      let res
      if (fresh) res = await executeAndPoll(DUNE_QUERY_ID, (s) => setStatus(s))
      else {
        try { res = await getLatestResults(DUNE_QUERY_ID) }
        catch (e) { if (e.code === 'NO_KEY') throw e; return load(true) }
        if (res.isEmpty) return load(true)
      }
      setSwaps(normalizeRows(res.rows)); setExecutedAt(res.executedAt); setStatus('ready')
    } catch (e) {
      if (e.code === 'NO_KEY') { setHasKey(false); return }
      setError(e.message || String(e)); setStatus('error')
    }
  }, [])

  useEffect(() => {
    const demo = import.meta.env.DEV && typeof location !== 'undefined' && location.hash === '#demo'
    if (demo) { import('./lib/sampleRows.js').then(({ SAMPLE_ROWS }) => { setSwaps(normalizeRows(SAMPLE_ROWS)); setStatus('ready') }); return }
    if (hasKey) load(false)
  }, [hasKey, load])

  const periodDays = useMemo(() => PERIODS.find((p) => p.key === period)?.days ?? null, [period])
  const nowMs = useMemo(() => Date.now(), [swaps, period])
  const mk = useMemo(() => computeMarkout(swaps, periodDays, nowMs), [swaps, periodDays, nowMs])

  const busy = status === 'loading' || status === 'executing' || status === 'polling'
  const statusText = { loading: 'Loading cached results…', executing: 'Running query…', polling: 'Waiting for Dune…' }[status]
  const hasData = !!swaps.length

  // Headline = the external-flow comparison, framed honestly with its verdict.
  const ext = mk.comparisons.find((c) => c.label === 'External flow')
  const within = ext && ext.significant === false
  const verdictColor = !ext || ext.significant == null ? 'var(--muted2)' : within ? 'var(--muted2)' : ext.delta >= 0 ? 'var(--pos)' : 'var(--warn)'

  return (
    <div className="wrap fadein">
      <header>
        <div className="title">
          <h1>Markout · <span>Bot pool vs control</span></h1>
          <p>
            Per-swap markout (LP PnL vs fair price at +5min) for the LVR{' '}
            <a href={BALANCER_POOL_URL(TREATMENT_POOL)} target="_blank" rel="noreferrer">bot pool</a>{' '}
            vs its{' '}
            <a href={BALANCER_POOL_URL(CONTROL_POOL)} target="_blank" rel="noreferrer">control</a>{' '}
            — adverse selection / pool price-efficiency, with honest confidence intervals.
          </p>
        </div>
        <div className="toolbar">
          {hasData && <PeriodSelector value={period} onChange={setPeriod} />}
          {hasData && <span className="pill"><span className="dot" /> {executedAt ? relative(executedAt) : 'live'}</span>}
          {hasKey && (
            <button className="btn" onClick={() => load(true)} disabled={busy}>
              {busy ? <><span className="spinner" /> {statusText}</> : 'Refresh data'}
            </button>
          )}
        </div>
      </header>

      <ApiKeyPanel onSaved={() => setHasKey(true)} />

      {error && <div className="banner">⚠ {error}</div>}
      {hasKey && busy && !hasData && <div className="card pad state" style={{ marginTop: 16 }}><span className="spinner" /> {statusText}</div>}

      {hasData && ext && (
        <>
          <div className="hero">
            <div className="heromain">
              <div className="k">External-flow markout · bot pool − control (+5min)</div>
              <div className="bigmult" style={{ color: verdictColor, textShadow: 'none' }}>{fmtBps(ext.delta)}</div>
              <div className="sub">
                bot pool <b style={{ color: 'var(--pos)' }}>{fmtBps(ext.treat.m5Bps)}</b> vs control <b>{fmtBps(ext.ctrl.m5Bps)}</b>
                {ext.deltaSE != null && <> · 95% CI ±{(1.96 * ext.deltaSE).toFixed(1)} bps</>}
              </div>
              <div className="hero-drift">
                {ext.significant === false
                  ? <><b style={{ color: 'var(--warn)' }}>Within noise</b> ({ext.sigma?.toFixed(1)}σ) — the difference is not yet statistically distinguishable from zero.</>
                  : ext.significant
                    ? <><b style={{ color: 'var(--pos)' }}>Significant</b> ({ext.sigma?.toFixed(1)}σ) over this window.</>
                    : 'Not enough data to test significance.'}
              </div>
            </div>
            <div className="statgrid">
              <div className="stat">
                <div className="k">Comparison window</div>
                <div className="v">{mk.overlapDays.toFixed(1)}d</div>
                <div className="vsub">since {mk.overlapStart ? when(new Date(mk.overlapStart).toISOString()) : '—'} · both pools live</div>
              </div>
              <div className="stat">
                <div className="k">Bot (arb) markout</div>
                <div className="v">{fmtBps(mk.groups.treatBot.m5Bps)}</div>
                <div className="vsub">LVR extracted — returned separately</div>
              </div>
              <div className="stat">
                <div className="k">External swaps</div>
                <div className="v">{compactNum(mk.groups.treatExt.n + mk.groups.ctrlExt.n)}</div>
                <div className="vsub">{mk.groups.treatExt.episodes + mk.groups.ctrlExt.episodes} price-minutes</div>
              </div>
              <div className="stat">
                <div className="k">Per-swap noise</div>
                <div className="v">±tens bps</div>
                <div className="vsub">5-min BTC/ETH drift · minute prices</div>
              </div>
            </div>
          </div>

          <div className="section"><ComparisonPanel comparisons={mk.comparisons} /></div>

          <div className="section card pad">
            <div className="ph flush">Markout decay curve
              <span className="right">bps of notional · same window</span>
            </div>
            <MarkoutCurve curve={mk.curve} />
          </div>

          <div className="section"><FlowTable groups={mk.groups} /></div>
          <div className="section"><SwapsTable swaps={mk.swaps} /></div>
          <div className="section"><Methodology /></div>
        </>
      )}

      <footer>
        <div>
          Markout = inventory marked to fair USD price at +5min · same-window, clustered 95% CIs ·{' '}
          <a href={`https://dune.com/queries/${DUNE_QUERY_ID}`} target="_blank" rel="noreferrer">Dune query #{DUNE_QUERY_ID}</a>
        </div>
        <div>Within-noise differences shown as such</div>
      </footer>
    </div>
  )
}
