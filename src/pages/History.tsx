import { useMemo } from 'react'
import Bracket from '../components/Bracket'
import RankingsTable from '../components/RankingsTable'
import ResultsTable from '../components/ResultsTable'
import { bracket, selection } from '../elims'
import { computeRankings } from '../rankings'
import { hasPlayed, replaceNote, scrimData, scrimDay, scrimName, type Scrim } from '../scrims'
import { exportJSON, getEvent, reopenScrim, setEvent, setHistory, useEvent, useHistory } from '../store'
import { isPlayed, type EventData } from '../types'

const CURRENT = 'current'
const dayLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** Champion and played matches of a scrim's eliminations, if it got that far. */
function elimsOf(ev: EventData) {
  if (!ev.elims?.locked) return null
  const b = bracket(ev.elims, selection(ev.elims).alliances)
  return { ...b, played: b.matches.filter(isPlayed) }
}

function NameInput({ ev, onRename, className = '' }: { ev: EventData; onRename: (name: string) => void; className?: string }) {
  return (
    <input value={ev.name ?? ''} placeholder={scrimName({ ...ev, name: '' })} onChange={(e) => onRename(e.target.value)}
      title="Rename" className={`border-transparent! bg-transparent! font-semibold hover:border-zinc-400! focus:border-zinc-400! ${className}`} />
  )
}

const renameCurrent = (name: string) => setEvent((ev) => ({ ...ev, name }))
const renameArchived = (id: string) => (name: string) => setHistory((h) => h.map((s) => (s.id === id ? { ...s, name } : s)))
const remove = (s: Scrim) =>
  confirm(`Delete “${scrimName(s)}” from History? This can't be undone.`) && setHistory((h) => h.filter((x) => x.id !== s.id))
const reopen = (s: Scrim) => {
  if (!confirm(`Make “${scrimName(s)}” the current scrim? ${replaceNote(getEvent())}`)) return
  reopenScrim(s.id)
  location.hash = '#/schedule'
}
const download = (ev: EventData) => exportJSON(ev, `${scrimName(ev).replace(/[^\w -]+/g, '')}.json`)

/** One scrim: final rankings and only the matches that were played. */
function Detail({ ev, scrim }: { ev: EventData; scrim?: Scrim }) {
  const quals = ev.matches.filter(isPlayed)
  const rankings = useMemo(() => computeRankings(ev.teams.map((t) => t.number), ev.matches), [ev])
  const elims = useMemo(() => elimsOf(ev), [ev])
  const champion = elims?.champion && elims.alliances[elims.champion - 1]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <a href="#/history" className="btn">← History</a>
        <NameInput ev={ev} onRename={scrim ? renameArchived(scrim.id) : renameCurrent} className="w-72 text-xl" />
        <span className="text-sm text-zinc-500">{dayLabel(scrimDay({ ...ev, archivedAt: scrim?.archivedAt }))}</span>
        <span className="flex-1" />
        <button className="btn" onClick={() => download(ev)}>Download JSON</button>
        {scrim && <button className="btn" onClick={() => reopen(scrim)}>Reopen</button>}
      </div>

      {champion && (
        <p className="rounded-lg bg-amber-400/15 px-4 py-2 font-semibold">
          🏆 Champions: Alliance {elims.champion} · {champion.join(' & ')}
        </p>
      )}

      {elims && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Eliminations</h2>
          <div className="mb-3 overflow-x-auto rounded-lg bg-zinc-200/50 p-3 text-sm dark:bg-zinc-900"><Bracket b={elims} teams={ev.teams} /></div>
          {elims.played.length ? <ResultsTable matches={elims.played} teams={ev.teams} /> : <p className="text-zinc-500">No elimination matches played.</p>}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-bold">Rankings</h2>
        <RankingsTable rankings={rankings} teams={ev.teams} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Qualification matches played ({quals.length})</h2>
        {quals.length ? <ResultsTable matches={quals} teams={ev.teams} /> : <p className="text-zinc-500">None played.</p>}
      </section>
    </div>
  )
}

export default function History({ id }: { id?: string }) {
  const history = useHistory()
  const current = useEvent()

  if (id) {
    const scrim = history.find((s) => s.id === id)
    if (id === CURRENT) return <Detail ev={current} />
    return scrim ? <Detail ev={scrimData(scrim)} scrim={scrim} /> : <p>That scrim isn't in History any more. <a href="#/history" className="underline">Back</a></p>
  }

  // Newest day first; the scrim in progress is listed too.
  const rows: { ev: EventData; scrim?: Scrim }[] = [{ ev: current }, ...history.map((s) => ({ ev: scrimData(s), scrim: s }))]
  const days = new Map<string, typeof rows>()
  for (const row of rows.sort((a, b) => scrimDay(b.ev) - scrimDay(a.ev))) {
    const day = dayLabel(scrimDay({ ...row.ev, archivedAt: row.scrim?.archivedAt }))
    days.set(day, [...(days.get(day) ?? []), row])
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Scrim history</h1>
      <p className="mb-4 text-sm text-zinc-500">
        Saved in this browser only. <b>New scrim</b> files the current one here. Click a name to rename it.
      </p>
      {[...days].map(([day, list]) => (
        <section key={day} className="mb-5">
          <h2 className="mb-1 text-sm font-bold tracking-wide text-zinc-500 uppercase">{day}</h2>
          {list.map(({ ev, scrim }) => {
            const elims = elimsOf(ev)
            return (
              <div key={scrim?.id ?? CURRENT} className="flex flex-wrap items-center gap-2 border-t border-zinc-200 py-2 dark:border-zinc-800">
                <NameInput ev={ev} onRename={scrim ? renameArchived(scrim.id) : renameCurrent} className="w-64" />
                {!scrim && <span className="rounded bg-emerald-600 px-1.5 text-xs font-bold text-white uppercase">current</span>}
                <span className="text-sm text-zinc-500">
                  {ev.teams.length} teams · {ev.matches.filter(isPlayed).length} matches played
                  {elims?.played.length ? ` · ${elims.played.length} elimination matches` : ''}
                  {elims?.champion ? ` · champions: ${elims.alliances[elims.champion - 1].join(' & ')}` : ''}
                </span>
                <span className="flex-1" />
                <a className="btn" href={`#/history/${scrim?.id ?? CURRENT}`}>View</a>
                {scrim && <button className="btn" onClick={() => reopen(scrim)}>Reopen</button>}
                {scrim && <button className="btn" onClick={() => remove(scrim)}>Delete</button>}
              </div>
            )
          })}
        </section>
      ))}
      {!history.length && !hasPlayed(current) && <p className="text-zinc-500">No scrims saved yet.</p>}
    </div>
  )
}
