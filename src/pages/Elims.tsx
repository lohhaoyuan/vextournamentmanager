import { useMemo, useState } from 'react'
import Bracket from '../components/Bracket'
import { allianceCount, bracket, elimResult, selection } from '../elims'
import { computeRankings } from '../rankings'
import { setEvent, useEvent } from '../store'
import { isPlayed, teamLabel, type Auton, type ElimMatch, type ElimResult, type Elims as ElimsData, type Team } from '../types'

const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)))
const setElims = (update: (e: ElimsData) => ElimsData | undefined) => setEvent((ev) => ({ ...ev, elims: ev.elims && update(ev.elims) }))

function Setup({ teams, ranked }: { teams: Team[]; ranked: string[] }) {
  const max = Math.min(16, Math.floor(ranked.length / 2))
  const [size, setSize] = useState(() => Math.max(2, allianceCount(ranked.length)))
  const [finalsBestOf, setBestOf] = useState<1 | 3>(1)
  const { matches } = useEvent()
  const unplayed = matches.filter((m) => !m.skipped && !isPlayed(m)).length

  if (max < 2) return <p className="text-zinc-500">Eliminations need at least 4 teams.</p>
  const start = () =>
    (!unplayed || confirm(`${unplayed} qualification matches haven't been played. Start Alliance Selection with the rankings as they are?`)) &&
    setEvent((ev) => ({ ...ev, elims: { size: Math.min(size, max), order: ranked, invites: [], finalsBestOf, results: {} } }))

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-zinc-500">
        Alliance Selection follows the current rankings ({teams.length} teams). The suggested number of Alliances comes from rule T14.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm">
          Alliances{' '}
          <input type="number" min={2} max={max} value={size} onChange={(e) => setSize(Math.max(2, Math.min(max, Number(e.target.value))))} className="w-16" />
          <span className="text-zinc-500"> (max {max})</span>
        </label>
        <BestOf value={finalsBestOf} onChange={setBestOf} />
        <button className="btn bg-alliance-blue! text-white" onClick={start}>Start Alliance Selection</button>
      </div>
    </div>
  )
}

function BestOf({ value, onChange }: { value: 1 | 3; onChange: (v: 1 | 3) => void }) {
  return (
    <label className="text-sm" title="Rule T18: Finals are Best of 3 at events that qualify for Worlds, otherwise Best of 1">
      Finals{' '}
      <select value={value} onChange={(e) => onChange(Number(e.target.value) as 1 | 3)}>
        <option value={1}>Best of 1</option>
        <option value={3}>Best of 3</option>
      </select>
    </label>
  )
}

function Selection({ e, teams }: { e: ElimsData; teams: Team[] }) {
  const sel = selection(e)
  const rank = (t: string) => e.order.indexOf(t) + 1
  const taken = new Set(sel.alliances.flat())
  const invite = (team: string, accepted: boolean) => setElims((x) => ({ ...x, invites: [...x.invites, { team, accepted }] }))
  const lock = () =>
    (sel.done || confirm(`Only ${sel.alliances.length} of ${e.size} Alliances are formed. Start eliminations with ${sel.alliances.length}?`)) &&
    setElims((x) => ({ ...x, locked: true }))
  const cancel = () => confirm('Cancel Alliance Selection? All invitations are lost.') && setEvent((ev) => ({ ...ev, elims: undefined }))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-lg">
          {sel.captain
            ? sel.available.length
              ? <>Alliance {sel.alliances.length + 1} captain <b className="font-mono">{sel.captain}</b> is inviting…</>
              : <>Nobody left for <b className="font-mono">{sel.captain}</b> to invite, so there will be {sel.alliances.length} Alliances (rule T16).</>
            : <>All {e.size} Alliances are formed.</>}
        </span>
        <span className="flex-1" />
        <button className="btn" disabled={!e.invites.length} onClick={() => setElims((x) => ({ ...x, invites: x.invites.slice(0, -1) }))}>Undo</button>
        <button className="btn" onClick={cancel}>Cancel selection</button>
        <button className="btn bg-alliance-blue! text-white disabled:opacity-40" disabled={sel.alliances.length < 2} onClick={lock}>
          Start eliminations
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500"><tr><th className="px-2">Alliance</th><th>Captain</th><th>Partner</th></tr></thead>
          <tbody>
            {Array.from({ length: e.size }, (_, i) => {
              const a = sel.alliances[i]
              const current = i === sel.alliances.length && sel.captain
              return (
                <tr key={i} className={`border-t border-zinc-200 dark:border-zinc-800 ${current ? 'bg-amber-400/20' : ''}`}>
                  <td className="px-2 py-1 font-bold">{i + 1}</td>
                  <td>{a ? teamLabel(a[0], teams) : current ? <b>{teamLabel(sel.captain!, teams)}</b> : ''}</td>
                  <td>{a ? teamLabel(a[1], teams) : current ? <span className="text-zinc-500">choosing…</span> : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500"><tr><th className="px-2">Rank</th><th>Team</th><th /></tr></thead>
          <tbody>
            {e.order.filter((t) => !taken.has(t)).map((t) => (
              <tr key={t} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-2 py-1 tabular-nums">{rank(t)}</td>
                <td className={sel.declined.has(t) && t !== sel.captain ? 'text-zinc-500' : ''}>{teamLabel(t, teams)}</td>
                <td className="text-right whitespace-nowrap">
                  {t === sel.captain ? <span className="text-xs font-bold text-amber-500 uppercase">captain</span>
                    : sel.declined.has(t) ? <span className="text-xs text-zinc-500" title="Can't be invited again, but can still be a captain (T16)">declined</span>
                    : sel.captain && <>
                      <button className="btn" onClick={() => invite(t, true)}>Accepts</button>{' '}
                      <button className="btn" onClick={() => invite(t, false)}>Declines</button>
                    </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const OUTCOME = { R: 'Red wins', B: 'Blue wins', T: 'Tie', X: 'Both DQ: replay' }

function ElimRow({ m, teams, next }: { m: ElimMatch; teams: Team[]; next: boolean }) {
  const update = (patch: Partial<ElimResult>) =>
    setElims((e) => {
      const saved = e.results[m.id]
      const base = saved?.red === m.seeds[0] && saved.blue === m.seeds[1] ? saved : {}
      return { ...e, results: { ...e.results, [m.id]: { ...base, ...patch, red: m.seeds[0], blue: m.seeds[1] } } }
    })
  const toggleDQ = (t: string) => update({ dq: m.dq?.includes(t) ? m.dq.filter((x) => x !== t) : [...(m.dq ?? []), t] })
  const alliance = (side: 'red' | 'blue') => (
    <td className={`px-2 ${side === 'red' ? 'bg-alliance-red/15' : 'bg-alliance-blue/15'}`}>
      <span className="mr-2 text-xs font-bold text-zinc-500">A{m.seeds[side === 'red' ? 0 : 1]}</span>
      {m[side].map((t) => (
        <span key={t} className="mr-2 inline-flex items-center gap-1">
          <span title={teams.find((x) => x.number === t)?.name} className={`font-mono ${m.dq?.includes(t) ? 'line-through opacity-60' : ''}`}>{t}</span>
          <button onClick={() => toggleDQ(t)} title={m.dq?.includes(t) ? 'Remove disqualification' : 'Disqualify (the whole Alliance loses, rule GG6)'}
            className={`rounded px-1 text-[10px] leading-4 font-bold ${m.dq?.includes(t) ? 'bg-amber-500 text-black' : 'text-zinc-400 ring-1 ring-zinc-300 hover:text-zinc-100 dark:ring-zinc-700'}`}>
            DQ
          </button>
        </span>
      ))}
    </td>
  )
  const res = isPlayed(m) ? elimResult(m) : null

  return (
    <tr className={`border-t border-zinc-200 dark:border-zinc-800 ${next ? 'outline-2 -outline-offset-2 outline-amber-400' : ''}`}>
      <td className="px-2 py-1 font-semibold whitespace-nowrap">
        {m.id}{next && <span className="ml-1 text-xs font-bold text-amber-500 uppercase">up next</span>}
      </td>
      {alliance('red')}{alliance('blue')}
      <td className="px-1">
        <input type="number" min={0} value={m.redScore ?? ''} onChange={(e) => update({ redScore: num(e.target.value) })}
          className={`w-16 text-right ${res === 'R' ? 'border-alliance-red! font-bold' : ''}`} />
      </td>
      <td className="px-1">
        <input type="number" min={0} value={m.blueScore ?? ''} onChange={(e) => update({ blueScore: num(e.target.value) })}
          className={`w-16 text-right ${res === 'B' ? 'border-alliance-blue! font-bold' : ''}`} />
      </td>
      <td className="px-1">
        <select value={m.auton ?? ''} onChange={(e) => update({ auton: (e.target.value || null) as Auton })}>
          <option value="">None</option><option value="R">Red</option><option value="B">Blue</option><option value="D">Tie</option>
        </select>
      </td>
      <td className="px-2 text-sm text-zinc-500">{res && OUTCOME[res]}</td>
    </tr>
  )
}

function ElimBracket({ e, teams }: { e: ElimsData; teams: Team[] }) {
  const b = useMemo(() => bracket(e, selection(e).alliances), [e])
  const next = b.matches.find((m) => !isPlayed(m))
  const unlock = () =>
    confirm('Go back to Alliance Selection? All elimination scores are cleared.') &&
    setElims((x) => ({ ...x, locked: false, results: {} }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-500">
          {b.champion ? <>🏆 Alliance {b.champion} are the champions.</> : next ? <>Up next: <b>{next.id}</b></> : null}
          {' '}Ties: rematch; after 2 ties (3 in a Best of 1 Finals) the higher seed advances (rule T19).
        </span>
        <span className="flex-1" />
        <BestOf value={e.finalsBestOf} onChange={(finalsBestOf) => setElims((x) => ({ ...x, finalsBestOf }))} />
        <button className="btn" onClick={unlock}>Back to selection</button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-sm"><Bracket b={b} teams={teams} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-zinc-500">
            <tr>
              <th className="px-2">Match</th><th className="px-2 text-alliance-red">Red</th><th className="px-2 text-alliance-blue">Blue</th>
              <th className="px-1 text-alliance-red">Red</th><th className="px-1 text-alliance-blue">Blue</th><th className="px-1">Auton</th><th />
            </tr>
          </thead>
          <tbody>{b.matches.map((m) => <ElimRow key={m.id} m={m} teams={teams} next={m === next} />)}</tbody>
        </table>
      </div>
    </div>
  )
}

export default function Elims() {
  const { teams, matches, elims } = useEvent()
  const ranked = useMemo(() => computeRankings(teams.map((t) => t.number), matches).map((r) => r.team), [teams, matches])

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        {!elims ? 'Eliminations' : !elims.locked ? 'Alliance Selection' : 'Elimination Bracket'}
      </h1>
      {!elims ? <Setup teams={teams} ranked={ranked} />
        : !elims.locked ? <Selection e={elims} teams={teams} />
        : <ElimBracket e={elims} teams={teams} />}
    </div>
  )
}
