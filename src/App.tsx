import { useEffect, useRef, useState } from 'react'
import NewScrim from './components/NewScrim'
import { replaceNote, scrimName } from './scrims'
import { exportJSON, importJSON, setEvent, useEvent } from './store'
import Teams from './pages/Teams'
import Schedule from './pages/Schedule'
import Rankings from './pages/Rankings'
import Elims from './pages/Elims'
import History from './pages/History'
import Display from './pages/Display'

const PAGES = { schedule: Schedule, teams: Teams, rankings: Rankings, elims: Elims, history: History, display: Display }
type Page = keyof typeof PAGES
const NAV: [Page, string][] = [['schedule', 'Schedule'], ['teams', 'Teams'], ['rankings', 'Rankings'], ['elims', 'Eliminations'], ['history', 'History']]

// Hash routing (#/display, #/history/<id>) so the built file works from file:// too; /display also works on a server.
function currentRoute(): [Page, string | undefined] {
  const [name, param] = (location.hash.replace(/^#\/?/, '') || location.pathname.split('/').pop() || '').split('/')
  return [name in PAGES ? (name as Page) : 'schedule', param]
}

function useTheme() {
  const [dark, setDark] = useState(() => localStorage.getItem('vex-theme') !== 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('vex-theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark] as const
}

export default function App() {
  const [[page, param], setRoute] = useState(currentRoute)
  const [dark, setDark] = useTheme()
  const [newScrim, setNewScrim] = useState(false)
  const ev = useEvent()
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onHash = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (page === 'display') return <Display />
  const Page = PAGES[page]

  const onImport = async (file?: File) => {
    if (!file || !confirm(`Load this file as the current scrim? ${replaceNote(ev)}`)) return
    try {
      await importJSON(file)
    } catch (e) {
      alert(`Import failed: ${(e as Error).message}`)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <nav className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-300 pb-3 dark:border-zinc-800">
        <span className="font-bold">
          <span className="text-alliance-red">VEX</span> <span className="text-alliance-blue">Scrimmage</span>
        </span>
        <input value={ev.name ?? ''} placeholder={scrimName({ ...ev, name: '' })} title="Rename this scrim"
          onChange={(e) => setEvent((prev) => ({ ...prev, name: e.target.value }))}
          className="mr-2 w-44 border-transparent! bg-transparent! hover:border-zinc-400! focus:border-zinc-400!" />
        {NAV.map(([p, label]) => (
          <a key={p} href={`#/${p}`} className={`btn ${page === p ? 'ring-2 ring-zinc-400' : ''}`}>{label}</a>
        ))}
        <a href="#/display" target="_blank" className="btn">Open display ↗</a>
        <span className="flex-1" />
        <button className="btn" onClick={() => setNewScrim(true)}>New scrim</button>
        <button className="btn" onClick={() => exportJSON()}>Export JSON</button>
        <button className="btn" onClick={() => fileInput.current?.click()}>Import JSON</button>
        <input ref={fileInput} type="file" accept=".json" hidden
          onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = '' }} />
        <button className="btn" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} theme</button>
      </nav>
      {page === 'history' ? <History id={param} /> : <Page />}
      {newScrim && <NewScrim onClose={() => setNewScrim(false)} />}
    </div>
  )
}
