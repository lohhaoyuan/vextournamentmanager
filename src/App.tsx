import { useEffect, useRef, useState } from 'react'
import { exportJSON, importJSON } from './store'
import Teams from './pages/Teams'
import Schedule from './pages/Schedule'
import Rankings from './pages/Rankings'
import Display from './pages/Display'

const PAGES = { schedule: Schedule, teams: Teams, rankings: Rankings, display: Display }
type Page = keyof typeof PAGES

// Hash routing (#/display) so the built file works from file:// too; /display also works on a server.
function currentPage(): Page {
  const name = location.hash.replace(/^#\/?/, '') || location.pathname.split('/').pop() || ''
  return name in PAGES ? (name as Page) : 'schedule'
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
  const [page, setPage] = useState(currentPage)
  const [dark, setDark] = useTheme()
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onHash = () => setPage(currentPage())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (page === 'display') return <Display />
  const Page = PAGES[page]

  const onImport = async (file?: File) => {
    if (!file || !confirm('Replace all teams, matches and scores with this file?')) return
    try {
      await importJSON(file)
    } catch (e) {
      alert(`Import failed: ${(e as Error).message}`)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <nav className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-300 pb-3 dark:border-zinc-800">
        <span className="mr-3 font-bold">
          <span className="text-alliance-red">VEX</span> <span className="text-alliance-blue">Scrimmage</span>
        </span>
        {(['schedule', 'teams', 'rankings'] as const).map((p) => (
          <a key={p} href={`#/${p}`} className={`btn capitalize ${page === p ? 'ring-2 ring-zinc-400' : ''}`}>
            {p}
          </a>
        ))}
        <a href="#/display" target="_blank" className="btn">Open display ↗</a>
        <span className="flex-1" />
        <button className="btn" onClick={exportJSON}>Export JSON</button>
        <button className="btn" onClick={() => fileInput.current?.click()}>Import JSON</button>
        <input ref={fileInput} type="file" accept=".json" hidden
          onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = '' }} />
        <button className="btn" onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'} theme</button>
      </nav>
      <Page />
    </div>
  )
}
