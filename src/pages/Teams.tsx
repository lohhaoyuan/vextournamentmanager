import { useState } from 'react'
import { setEvent, useEvent } from '../store'
import type { Match } from '../types'

const renameIn = (m: Match, from: string, to: string): Match => {
  const r = (t: string) => (t === from ? to : t)
  return { ...m, red: [r(m.red[0]), r(m.red[1])], blue: [r(m.blue[0]), r(m.blue[1])], surrogates: m.surrogates?.map(r), dq: m.dq?.map(r) }
}

export default function Teams() {
  const { teams } = useEvent()
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const n = number.trim().toUpperCase()
    if (!n) return
    if (teams.some((t) => t.number === n)) return alert(`${n} is already in the list`)
    setEvent((ev) => ({ ...ev, teams: [...ev.teams, { number: n, name: name.trim() }] }))
    setNumber('')
    setName('')
  }

  // Renaming a team number also updates it in the schedule.
  const renumber = (from: string, raw: string) => {
    const to = raw.trim().toUpperCase()
    if (!to || to === from) return
    if (teams.some((t) => t.number === to)) return alert(`${to} is already in the list`)
    setEvent((ev) => ({
      teams: ev.teams.map((t) => (t.number === from ? { ...t, number: to } : t)),
      matches: ev.matches.map((m) => renameIn(m, from, to)),
    }))
  }

  const rename = (num: string, newName: string) =>
    setEvent((ev) => ({ ...ev, teams: ev.teams.map((t) => (t.number === num ? { ...t, name: newName } : t)) }))

  const remove = (num: string) =>
    confirm(`Delete ${num}? It stays in any scheduled matches as a number only.`) &&
    setEvent((ev) => ({ ...ev, teams: ev.teams.filter((t) => t.number !== num) }))

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Teams ({teams.length})</h1>
      <form onSubmit={add} className="mb-4 flex gap-2">
        <input placeholder="Number, e.g. 8076Y" value={number} onChange={(e) => setNumber(e.target.value)} className="w-44" />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-64" />
        <button className="btn">Add team</button>
      </form>
      <table className="w-full max-w-2xl text-left">
        <thead className="text-sm text-zinc-500">
          <tr><th className="py-1">Number</th><th>Name</th><th /></tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.number} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="py-1">
                <input defaultValue={t.number} className="w-32 font-mono"
                  onBlur={(e) => { renumber(t.number, e.target.value); e.target.value = t.number }} />
              </td>
              <td><input value={t.name} onChange={(e) => rename(t.number, e.target.value)} className="w-full" /></td>
              <td className="pl-2 text-right"><button className="btn" onClick={() => remove(t.number)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!teams.length && <p className="text-zinc-500">No teams yet. Add some above.</p>}
    </div>
  )
}
