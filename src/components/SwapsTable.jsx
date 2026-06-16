import { useState } from 'react'
import { usd, when, shortAddr } from '../lib/format'
import { EXPLORER_TX } from '../config'

const bpsOf = (m, notional) => (notional > 0 ? (m / notional) * 10000 : null)
const fmtBps = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(1))
const col = (x) => (x == null ? 'var(--muted2)' : x >= 0 ? 'var(--pos)' : 'var(--warn)')

export default function SwapsTable({ swaps }) {
  const [limit, setLimit] = useState(25)
  const shown = swaps.slice(0, limit)

  return (
    <div className="card">
      <div className="ph">Swaps <span className="right">{swaps.length} in window</span></div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Pool</th>
              <th>Flow</th>
              <th className="num">Notional</th>
              <th className="num hide-sm">Mkt +0</th>
              <th className="num hide-sm">Mkt +1m</th>
              <th className="num">Mkt +5m (bps)</th>
              <th className="num">Tx</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const b5 = bpsOf(s.m5, s.notionalUsd)
              return (
                <tr key={s.txHash + s.time}>
                  <td className="muted">{when(s.time)}</td>
                  <td>{s.pool === 'treatment' ? 'Bot pool' : 'Control'}</td>
                  <td><span className={'tag ' + (s.flow === 'bot' ? 'fee' : 'reduced')}>{s.flow}</span></td>
                  <td className="num">{usd(s.notionalUsd)}</td>
                  <td className="num hide-sm" style={{ color: col(bpsOf(s.m0, s.notionalUsd)) }}>{fmtBps(bpsOf(s.m0, s.notionalUsd))}</td>
                  <td className="num hide-sm" style={{ color: col(bpsOf(s.m1, s.notionalUsd)) }}>{fmtBps(bpsOf(s.m1, s.notionalUsd))}</td>
                  <td className="num" style={{ color: col(b5), fontWeight: 600 }}>{fmtBps(b5)}</td>
                  <td className="num mono"><a href={EXPLORER_TX(s.txHash)} target="_blank" rel="noreferrer">{shortAddr(s.txHash)}</a></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {limit < swaps.length && (
        <div style={{ padding: 14, textAlign: 'center', borderTop: '1px solid var(--line)' }}>
          <button className="btn ghost" onClick={() => setLimit((l) => l + 50)}>Show more ({swaps.length - limit} remaining)</button>
        </div>
      )}
    </div>
  )
}
