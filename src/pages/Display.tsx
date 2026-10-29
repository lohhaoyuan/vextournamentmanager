import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import RankingsTable from '../components/RankingsTable'
import Timer from '../components/Timer'
import { computeRankings } from '../rankings'
import { useEvent } from '../store'
import { isPlayed, teamLabel, type Match, type Team } from '../types'

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-[1vw] bg-zinc-900 p-[1.2vw] ${className}`}>
      <h2 className="mb-[0.8vw] text-[1.4vw] font-bold uppercase tracking-widest text-zinc-400">{title}</h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function Alliance({ side, m, teams, score, won, auton }: {
  side: 'red' | 'blue'; m: Match; teams: Team[]; score?: number; won?: boolean; auton?: boolean
}) {
  const bg = side === 'red' ? 'bg-alliance-red' : 'bg-alliance-blue'
  return (
    <div className={`relative flex items-center gap-[1vw] rounded-[0.8vw] px-[1vw] py-[0.6vw] ${bg}
      ${won === false ? 'opacity-40' : ''} ${won ? 'ring-[0.3vw] ring-white' : ''}`}>
      <div className="min-w-0 flex-1 text-[1.6vw] leading-tight font-semibold">
        {m[side].map((t, i) => <div key={i} className="truncate">{teamLabel(t, teams)}</div>)}
      </div>
      {auton && <span className="rounded bg-white/90 px-[0.5vw] text-[1vw] font-bold text-zinc-900 uppercase">Auton</span>}
      {score != null && <div className="text-[3.5vw] font-black tabular-nums">{score}</div>}
    </div>
  )
}

/** Slowly scrolls its content to the bottom, waits, jumps back to the top, repeats. */
function AutoScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0, pos = 0, atEnd = false, prev = performance.now(), waitUntil = prev + 3000
    const step = (t: number) => {
      const el = ref.current
      const max = el ? el.scrollHeight - el.clientHeight : 0
      if (el && max > 0 && t >= waitUntil) {
        if (atEnd) [pos, atEnd, waitUntil] = [0, false, t + 3000]
        else if ((pos += (t - prev) * 0.04) >= max) [pos, atEnd, waitUntil] = [max, true, t + 3000]
        el.scrollTop = pos
      } else if (el && max <= 0) el.scrollTop = pos = 0
      prev = t
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={ref} className="h-full overflow-hidden">{children}</div>
}

const Big = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full items-center justify-center text-[3vw] font-bold text-zinc-500">{children}</div>
)

export default function Display() {
  const { teams, matches } = useEvent()
  const rankings = useMemo(() => computeRankings(teams.map((t) => t.number), matches), [teams, matches])
  const next = matches.find((m) => !isPlayed(m))
  const last = matches.findLast(isPlayed)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'f' && document.documentElement.requestFullscreen?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="dark flex h-screen flex-col gap-[1.2vw] overflow-hidden bg-zinc-950 p-[1.2vw] text-white">
      <div className="grid h-[48%] grid-cols-3 gap-[1.2vw]">
        <Card title={next ? `Up Next · ${next.id}` : 'Up Next'}>
          {next ? (
            <div className="flex h-full flex-col justify-center gap-[0.8vw]">
              <Alliance side="red" m={next} teams={teams} />
              <div className="text-center text-[1.2vw] font-bold text-zinc-500">VS</div>
              <Alliance side="blue" m={next} teams={teams} />
            </div>
          ) : <Big>{matches.length ? 'All Done!' : 'No schedule yet'}</Big>}
        </Card>

        <Card title="Match Timer"><Timer /></Card>

        <Card title={last ? `Last Result · ${last.id}` : 'Last Result'}>
          {last ? (() => {
            const tie = last.redScore === last.blueScore
            return (
              <div className="flex h-full flex-col justify-center gap-[0.8vw]">
                <Alliance side="red" m={last} teams={teams} score={last.redScore}
                  won={tie ? undefined : last.redScore! > last.blueScore!} auton={last.auton === 'R' || last.auton === 'D'} />
                <div className="text-center text-[1.2vw] font-bold text-zinc-500">{tie ? 'TIE' : 'VS'}</div>
                <Alliance side="blue" m={last} teams={teams} score={last.blueScore}
                  won={tie ? undefined : last.blueScore! > last.redScore!} auton={last.auton === 'B' || last.auton === 'D'} />
              </div>
            )
          })() : <Big>No matches played</Big>}
        </Card>
      </div>

      <Card title="Rankings" className="flex-1">
        <AutoScroll>
          <div className="text-[1.5vw] [&_thead]:bg-zinc-900"><RankingsTable rankings={rankings} teams={teams} /></div>
        </AutoScroll>
      </Card>

      <button onClick={() => document.documentElement.requestFullscreen?.()}
        className="fixed right-2 bottom-2 rounded bg-zinc-800 px-2 py-1 text-xs opacity-20 hover:opacity-100">
        Fullscreen (F)
      </button>
    </div>
  )
}
