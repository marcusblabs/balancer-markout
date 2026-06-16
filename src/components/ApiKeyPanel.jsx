import { useEffect, useState } from 'react'
import { getDuneApiKey, setDuneApiKey, subscribeDuneApiKey, looksLikeDuneKey } from '../lib/duneApiKey'
import { shortAddr } from '../lib/format'

export default function ApiKeyPanel({ onSaved }) {
  const [key, setKey] = useState(() => getDuneApiKey())
  const [editing, setEditing] = useState(() => !getDuneApiKey())
  const [draft, setDraft] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => subscribeDuneApiKey(setKey), [])

  const save = () => {
    const t = draft.trim()
    if (!looksLikeDuneKey(t)) { setErr('That does not look like a Dune API key.'); return }
    setDuneApiKey(t)
    setDraft(''); setErr(''); setEditing(false)
    onSaved?.()
  }

  if (!editing) {
    return (
      <div className="keypanel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="label">Dune API key</div>
            <div className="masked">{key ? shortAddr(key) : 'none'}</div>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => { setDraft(''); setEditing(true) }}>Change</button>
            <button className="btn ghost" onClick={() => setDuneApiKey('')}>Forget</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="keypanel prompt">
      <div className="label">Add your Dune API key to load capture data</div>
      <div className="hint">
        Free key at <a href="https://dune.com/settings/api" target="_blank" rel="noreferrer">dune.com/settings/api</a>.
        Stored only in your browser (localStorage) — sent only to dune.com, never to this site's host.
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input
          type="password" autoComplete="off" spellCheck={false} value={draft}
          placeholder="Paste your Dune API key…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
        />
        <button className="btn primary" onClick={save}>Save key</button>
      </div>
      {err && <div className="hint" style={{ color: 'var(--danger)' }}>{err}</div>}
    </div>
  )
}
