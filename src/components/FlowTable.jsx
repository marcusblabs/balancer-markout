import { usd, compactNum } from '../lib/format'

const bps = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + x.toFixed(2))
const col = (x) => (x == null ? 'var(--muted2)' : x >= 0 ? 'var(--pos)' : 'var(--warn)')

const ROWS = [
  { key: 'treatExt', label: 'Bot pool', sub: 'external flow', dot: '#63f2be' },
  { key: 'ctrlExt', label: 'Control pool', sub: 'external flow', dot: '#8b97ac' },
  { key: 'treatBot', label: 'Bot pool', sub: 'bot (arb) flow — returned to LPs', dot: '#7f6ae8' },
]

export default function FlowTable({ groups }) {
  return (
    <div className="card">
      <div className="ph">Markout by segment <span className="right">bps = markout per $ traded</span></div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Segment</th>
              <th className="num">Swaps</th>
              <th className="num">Volume</th>
              <th className="num">Mkt +0</th>
              <th className="num">Mkt +1m</th>
              <th className="num">Mkt +5m</th>
              <th className="num hide-sm">+5m USD</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const g = groups[r.key]
              if (!g || !g.n) return null
              return (
                <tr key={r.key}>
                  <td>
                    <div className="pool-cell">
                      <span className="pool-dot" style={{ color: r.dot }} />
                      <div><span style={{ fontWeight: 600 }}>{r.label}</span>
                        <div className="muted" style={{ fontSize: 11 }}>{r.sub}</div></div>
                    </div>
                  </td>
                  <td className="num">{compactNum(g.n)}</td>
                  <td className="num muted">{usd(g.volumeUsd)}</td>
                  <td className="num" style={{ color: col(g.m0Bps), fontVariantNumeric: 'tabular-nums' }}>{bps(g.m0Bps)}</td>
                  <td className="num" style={{ color: col(g.m1Bps), fontVariantNumeric: 'tabular-nums' }}>{bps(g.m1Bps)}</td>
                  <td className="num" style={{ color: col(g.m5Bps), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{bps(g.m5Bps)}</td>
                  <td className="num hide-sm" style={{ color: col(g.m5Usd) }}>{usd(g.m5Usd)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
