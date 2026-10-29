import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import Alliance from '../components/Alliance'
import Bracket from '../components/Bracket'
import RankingsTable from '../components/RankingsTable'
import Timer from '../components/Timer'
import { bracket, elimResult, selection } from '../elims'
import { allianceResult, computeRankings } from '../rankings'
import { useEvent } from '../store'
import { isPlayed, type Elims, type Team } from '../types'

function Card({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-h-0 flex-col rounded-[1vw] bg-zinc-900 p-[1.2vw] ${className}`}>
      <h2 className="mb-[0.8vw] text-[1.4vw] font-bold uppercase tracking-widest text-zinc-400">{title}</h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
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
  <div className="flex h-full flex-col items-center justify-center text-center text-[3vw] font-bold text-zinc-500">{children}</div>
)

/** The Alliances formed so far, then everyone still to be picked in rank order. */
function SelectionBoard({ e, teams }: { e: Elims; teams: Team[] }) {
  const sel = selection(e)
  const taken = new Set(sel.alliances.flat())
  const name = (t: string) => teams.find((x) => x.number === t)?.name
  return (
    <div className="grid h-full grid-cols-[3fr_2fr] gap-[1.2vw] text-[1.4vw]">
      <div className="grid grid-flow-col content-start gap-x-[1.2vw] gap-y-[0.4vw]" style={{ gridTemplateRows: `repeat(${Math.ceil(e.size / 2)}, auto)` }}>
        {Array.from({ length: e.size }, (_, i) => {
          const a = sel.alliances[i]
          const current = i === sel.alliances.length && sel.captain
          return (
            <div key={i} className={`flex gap-[0.6em] rounded-[0.4vw] px-[0.6em] py-[0.15em] ${current ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-800'}`}>
              <b className="w-[1.6em] text-right">{i + 1}</b>
              <span className="flex-1 truncate font-semibold">{a ? `${a[0]}  &  ${a[1]}` : current ? `${sel.captain}  & …` : ''}</span>
            </div>
          )
        })}
      </div>
      <div className="min-h-0">
        <div className="mb-[0.4vw] text-[0.8em] text-zinc-400">Still available, by rank</div>
        <div className="flex flex-wrap content-start gap-[0.4vw]">
          {e.order.filter((t) => !taken.has(t)).map((t) => (
            <span key={t} title={name(t)} className={`rounded-[0.3vw] px-[0.4em] tabular-nums ${t === sel.captain ? 'bg-amber-400 text-zinc-900'
              : sel.declined.has(t) ? 'bg-zinc-800 text-zinc-500 line-through' : 'bg-zinc-700'}`}>
              {e.order.indexOf(t) + 1}. {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Display() {
  const { teams, matches, elims } = useEvent()
  const rankings = useMemo(() => computeRankings(teams.map((t) => t.number), matches), [teams, matches])
  const elim = useMemo(() => (elims?.locked ? bracket(elims, selection(elims).alliances) : null), [elims])
  const selecting = elims && !elims.locked ? selection(elims) : null
  const next = elim ? elim.matches.find((m) => !isPlayed(m)) : selecting ? undefined : matches.find((m) => !m.skipped && !isPlayed(m))
  const last = elim?.matches.findLast(isPlayed) ?? matches.findLast(isPlayed)

  // Keep the projector laptop's screen from dimming or sleeping while the display is open (where allowed).
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    const grab = () => {
      if (document.visibilityState === 'visible') navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    }
    grab()
    document.addEventListener('visibilitychange', grab)
    return () => {
      document.removeEventListener('visibilitychange', grab)
      lock?.release()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'f' && document.documentElement.requestFullscreen?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="dark flex h-screen flex-col gap-[1.2vw] overflow-hidden bg-zinc-950 p-[1.2vw] text-white">
      <div className="grid h-[48%] grid-cols-3 gap-[1.2vw]">
        <Card title={next ? `Up Next · ${next.id}` : selecting ? 'Alliance Selection' : 'Up Next'}>
          {next ? (
            <div className="flex h-full flex-col justify-center gap-[0.8vw]">
              <Alliance side="red" m={next} teams={teams} />
              <div className="text-center text-[1.2vw] font-bold text-zinc-500">VS</div>
              <Alliance side="blue" m={next} teams={teams} />
            </div>
          ) : selecting ? (
            <Big>
              {selecting.captain && selecting.available.length ? <>
                <span className="text-[1.6vw] text-zinc-400">Alliance {selecting.alliances.length + 1} captain</span>
                <span className="text-white">{selecting.captain}</span>
                <span className="text-[1.4vw] text-zinc-400">{teams.find((t) => t.number === selecting.captain)?.name}</span>
              </> : 'Alliances formed'}
            </Big>
          ) : elim?.champion ? (
            <Big>
              <span className="text-[1.6vw] text-amber-400">🏆 Tournament Champions</span>
              <span className="text-white">Alliance {elim.champion}</span>
              <span className="text-[1.8vw] text-zinc-300">{elim.alliances[elim.champion - 1].join(' & ')}</span>
            </Big>
          ) : <Big>{matches.length ? 'All Done!' : 'No schedule yet'}</Big>}
        </Card>

        <Card title="Match Timer"><Timer match={next} teams={teams} /></Card>

        <Card title={last ? `Last Result · ${last.id}` : 'Last Result'}>
          {last ? (() => {
            // With a DQ, both qualification alliances can be awarded the win (GG6), so ask the rankings' rule.
            // In eliminations one alliance wins, both lose on a double DQ, or it's a tie (and a rematch).
            const res = 'seeds' in last ? elimResult(last) : null
            const red = res ? (res === 'T' ? 'T' : res === 'R' ? 'W' : 'L') : allianceResult(last, 'R')
            const blue = res ? (res === 'T' ? 'T' : res === 'B' ? 'W' : 'L') : allianceResult(last, 'B')
            const won = (r: string) => (r === 'T' ? undefined : r === 'W')
            return (
              <div className="flex h-full flex-col justify-center gap-[0.8vw]">
                <Alliance side="red" m={last} teams={teams} score={last.redScore}
                  won={won(red)} auton={last.auton === 'R' || last.auton === 'D'} />
                <div className="text-center text-[1.2vw] font-bold text-zinc-500">{red === 'T' && blue === 'T' ? 'TIE' : 'VS'}</div>
                <Alliance side="blue" m={last} teams={teams} score={last.blueScore}
                  won={won(blue)} auton={last.auton === 'B' || last.auton === 'D'} />
              </div>
            )
          })() : <Big>No matches played</Big>}
        </Card>
      </div>

      {elim ? (
        <Card title="Elimination Bracket" className="flex-1">
          <div className="h-full text-[0.95vw]"><Bracket b={elim} teams={teams} /></div>
        </Card>
      ) : elims ? (
        <Card title={`Alliance Selection · ${elims.size} Alliances`} className="flex-1"><SelectionBoard e={elims} teams={teams} /></Card>
      ) : (
        <Card title="Rankings" className="flex-1">
          <AutoScroll>
            <div className="text-[1.5vw] [&_thead]:bg-zinc-900"><RankingsTable rankings={rankings} teams={teams} /></div>
          </AutoScroll>
        </Card>
      )}

      <button onClick={() => document.documentElement.requestFullscreen?.()}
        className="fixed right-2 bottom-2 rounded bg-zinc-800 px-2 py-1 text-xs opacity-20 hover:opacity-100">
        Fullscreen (F)
      </button>
    </div>
  )
}
