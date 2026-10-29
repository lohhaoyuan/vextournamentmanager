import { useState } from 'react'
import { scheduleCSV } from '../csv'
import { generateSchedule, shuffleMatches } from '../schedule'
import { downloadFile, setEvent, useEvent } from '../store'
import { isPlayed, type Auton, type Match, type Team } from '../types'

const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)))

function TeamSlot({ m, team, edit, teams, onChange, onDQ }: {
  m: Match; team: string; edit: boolean; teams: Team[]
  onChange: (team: string, surrogate: boolean) => void
  onDQ: () => void
}) {
  const surrogate = !!m.surrogates?.includes(team)
  if (!edit) {
    const dq = !!m.dq?.includes(team)
    return (
      <span className="flex items-center gap-1.5">
        <span title={teams.find((t) => t.number === team)?.name} className={`font-mono ${dq ? 'line-through opacity-60' : ''}`}>
          {team}{surrogate && <sup title="Surrogate: doesn't count for rankings">*</sup>}
        </span>
        <button onClick={onDQ} title={dq ? 'Remove disqualification' : 'Disqualify this team in this match'}
          className={`rounded px-1 text-[10px] leading-4 font-bold ${dq ? 'bg-amber-500 text-black' : 'text-zinc-400 ring-1 ring-zinc-300 hover:text-zinc-100 dark:ring-zinc-700'}`}>
          DQ
        </button>
      </span>
    )
  }
  const options = teams.some((t) => t.number === team) ? teams : [{ number: team, name: '' }, ...teams]
  return (
    <span className="flex items-center gap-1">
      <select value={team} onChange={(e) => onChange(e.target.value, surrogate)} className="font-mono">
        {options.map((t) => <option key={t.number} value={t.number}>{t.number}</option>)}
      </select>
      <label title="Surrogate" className="text-xs">
        <input type="checkbox" checked={surrogate} onChange={(e) => onChange(team, e.target.checked)} /> S
      </label>
    </span>
  )
}

function MatchRow({ m, teams }: { m: Match; teams: Team[] }) {
  const [edit, setEdit] = useState(false)
  const update = (patch: Partial<Match>) =>
    setEvent((ev) => ({ ...ev, matches: ev.matches.map((x) => (x.id === m.id ? { ...x, ...patch } : x)) }))

  const setSlot = (side: 'red' | 'blue', i: 0 | 1, team: string, surrogate: boolean) => {
    const old = m[side][i]
    const alliance = [...m[side]] as [string, string]
    alliance[i] = team
    const surrogates = (m.surrogates ?? []).filter((t) => t !== old && t !== team)
    update({ [side]: alliance, surrogates: surrogate ? [...surrogates, team] : surrogates, dq: m.dq?.filter((t) => t !== old) })
  }

  const toggleDQ = (team: string) =>
    update({ dq: m.dq?.includes(team) ? m.dq.filter((t) => t !== team) : [...(m.dq ?? []), team] })

  const played = isPlayed(m)
  const winner = played ? (m.redScore! > m.blueScore! ? 'red' : m.blueScore! > m.redScore! ? 'blue' : 'tie') : null
  const slot = (side: 'red' | 'blue', i: 0 | 1) => (
    <td className={`px-2 ${side === 'red' ? 'bg-alliance-red/15' : 'bg-alliance-blue/15'}`}>
      <TeamSlot m={m} team={m[side][i]} edit={edit} teams={teams}
        onChange={(t, s) => setSlot(side, i, t, s)} onDQ={() => toggleDQ(m[side][i])} />
    </td>
  )

  return (
    <tr className={`border-t border-zinc-200 dark:border-zinc-800 ${m.skipped ? '[&>td:not(:last-child)]:opacity-35' : ''}`}>
      <td className="px-2 py-1 font-semibold">
        {m.id}{m.skipped && <span className="ml-1 text-xs font-bold text-amber-500 uppercase">skipped</span>}
      </td>
      {slot('red', 0)}{slot('red', 1)}{slot('blue', 0)}{slot('blue', 1)}
      <td className="px-1">
        <input type="number" min={0} value={m.redScore ?? ''} onChange={(e) => update({ redScore: num(e.target.value) })}
          className={`w-16 text-right ${winner === 'red' ? 'border-alliance-red! font-bold' : ''}`} />
      </td>
      <td className="px-1">
        <input type="number" min={0} value={m.blueScore ?? ''} onChange={(e) => update({ blueScore: num(e.target.value) })}
          className={`w-16 text-right ${winner === 'blue' ? 'border-alliance-blue! font-bold' : ''}`} />
      </td>
      <td className="px-1">
        <select value={m.auton ?? ''} onChange={(e) => update({ auton: (e.target.value || null) as Auton })}>
          <option value="">None</option>
          <option value="R">Red</option>
          <option value="B">Blue</option>
          <option value="D">Tie</option>
        </select>
      </td>
      <td className="text-center accent-alliance-red">
        <input type="checkbox" checked={m.redAWP} onChange={(e) => update({ redAWP: e.target.checked })} />
      </td>
      <td className="text-center accent-alliance-blue">
        <input type="checkbox" checked={m.blueAWP} onChange={(e) => update({ blueAWP: e.target.checked })} />
      </td>
      <td className="px-1 text-right whitespace-nowrap">
        <button className="btn" onClick={() => setEdit(!edit)}>{edit ? 'Done' : 'Edit teams'}</button>{' '}
        <button className="btn" onClick={() => update({ skipped: !m.skipped })}>{m.skipped ? 'Unskip' : 'Skip'}</button>
      </td>
    </tr>
  )
}

export default function Schedule() {
  const { teams, matches } = useEvent()
  const [perTeam, setPerTeam] = useState(6)

  const generate = () => {
    if (matches.length && !confirm('Replace the current schedule? All scores will be lost.')) return
    try {
      setEvent((ev) => ({ ...ev, matches: generateSchedule(ev.teams.map((t) => t.number), perTeam) }))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const shuffle = () =>
    confirm('Shuffle the match order? This clears ALL entered scores.') &&
    setEvent((ev) => ({ ...ev, matches: shuffleMatches(ev.matches) }))

  const playedCount = matches.filter(isPlayed).length
  const skippedCount = matches.filter((m) => m.skipped).length
  const hasSurrogates = matches.some((m) => m.surrogates?.length)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-4 text-xl font-bold">Schedule</h1>
        <label className="text-sm">
          Matches per team{' '}
          <input type="number" min={1} value={perTeam} onChange={(e) => setPerTeam(Math.max(1, Number(e.target.value)))} className="w-16" />
        </label>
        <button className="btn" onClick={generate}>Generate ({teams.length} teams)</button>
        <button className="btn" onClick={shuffle} disabled={!matches.length}>Shuffle order</button>
        <button className="btn" onClick={() => downloadFile('schedule.csv', scheduleCSV(matches), 'text/csv')} disabled={!matches.length}>
          Export CSV
        </button>
        <span className="text-sm text-zinc-500">
          {playedCount}/{matches.length} played{skippedCount > 0 && ` · ${skippedCount} skipped`}
          {hasSurrogates && ' · * = surrogate (not ranked)'}
        </span>
      </div>

      {matches.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="px-2">Match</th>
                <th className="px-2 text-alliance-red">Red 1</th>
                <th className="px-2 text-alliance-red">Red 2</th>
                <th className="px-2 text-alliance-blue">Blue 1</th>
                <th className="px-2 text-alliance-blue">Blue 2</th>
                <th className="px-1 text-alliance-red">Red</th>
                <th className="px-1 text-alliance-blue">Blue</th>
                <th className="px-1">Auton</th>
                <th className="px-1 text-alliance-red">Red AWP</th>
                <th className="px-1 text-alliance-blue">Blue AWP</th>
                <th />
              </tr>
            </thead>
            <tbody>{matches.map((m) => <MatchRow key={m.id} m={m} teams={teams} />)}</tbody>
          </table>
        </div>
      ) : (
        <p className="text-zinc-500">No schedule yet. Add teams, choose matches per team and press Generate.</p>
      )}
    </div>
  )
}
