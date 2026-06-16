/**
 * Minimal Dune API client (browser-side, user's own key).
 *
 * Two modes:
 *   getLatestResults(queryId)        — free-ish: returns the most recent cached
 *                                      execution of the saved query. Used on load.
 *   executeAndPoll(queryId, onState) — spends an execution credit: runs the query
 *                                      fresh, polls until done. Used by "Refresh".
 */

import { getDuneApiKey } from './duneApiKey'

const BASE = 'https://api.dune.com/api/v1'
const POLL_MS = 1500
const MAX_POLLS = 80 // ~2 min

function headers() {
  return { 'x-dune-api-key': getDuneApiKey(), 'Content-Type': 'application/json' }
}

function requireKey() {
  if (!getDuneApiKey()) {
    const e = new Error('No Dune API key set.')
    e.code = 'NO_KEY'
    throw e
  }
}

async function asError(res) {
  let detail = ''
  try {
    const j = await res.json()
    detail = j?.error || JSON.stringify(j)
  } catch {
    detail = await res.text().catch(() => '')
  }
  const e = new Error(`Dune API ${res.status}: ${detail || res.statusText}`)
  e.status = res.status
  return e
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Fetch the last cached results for a saved query (no fresh execution). */
export async function getLatestResults(queryId, { limit = 5000 } = {}) {
  requireKey()
  const res = await fetch(`${BASE}/query/${queryId}/results?limit=${limit}`, { headers: headers() })
  if (!res.ok) throw await asError(res)
  const json = await res.json()
  return {
    rows: json?.result?.rows ?? [],
    executedAt: json?.execution_ended_at || json?.result?.metadata?.execution_ended_at || null,
    isEmpty: !json?.result || (json?.result?.rows ?? []).length === 0,
  }
}

/** Execute a saved query fresh and poll to completion. */
export async function executeAndPoll(queryId, onState = () => {}, { limit = 5000 } = {}) {
  requireKey()
  onState('executing')
  const exec = await fetch(`${BASE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ performance: 'medium' }),
  })
  if (!exec.ok) throw await asError(exec)
  const { execution_id } = await exec.json()

  onState('polling')
  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_MS)
    const sres = await fetch(`${BASE}/execution/${execution_id}/status`, { headers: headers() })
    if (!sres.ok) throw await asError(sres)
    const status = await sres.json()
    const state = status?.state
    if (state === 'QUERY_STATE_COMPLETED') break
    if (state === 'QUERY_STATE_FAILED' || state === 'QUERY_STATE_CANCELLED') {
      throw new Error(`Query ${state.replace('QUERY_STATE_', '').toLowerCase()}.`)
    }
  }

  const rres = await fetch(`${BASE}/execution/${execution_id}/results?limit=${limit}`, { headers: headers() })
  if (!rres.ok) throw await asError(rres)
  const json = await rres.json()
  return {
    rows: json?.result?.rows ?? [],
    executedAt: json?.execution_ended_at || null,
    isEmpty: (json?.result?.rows ?? []).length === 0,
  }
}
