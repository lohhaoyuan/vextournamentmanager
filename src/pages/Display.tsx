import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import Alliance from '../components/Alliance'
import RankingsTable from '../components/RankingsTable'
import Timer from '../components/Timer'
import { allianceResult, computeRankings } from '../rankings'
import { useEvent } from '../store'
import { isPlayed } from '../types'

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
  <div className="flex h-full items-center justify-center text-[3vw] font-bold text-zinc-500">{children}</div>
)

export default function Display() {
  const { teams, matches } = useEvent()
  const rankings = useMemo(() => computeRankings(teams.map((t) => t.number), matches), [teams, matches])
  const next = matches.find((m) => !m.skipped && !isPlayed(m))
  const last = matches.findLast(isPlayed)

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
        <Card title={next ? `Up Next · ${next.id}` : 'Up Next'}>
          {next ? (
            <div className="flex h-full flex-col justify-center gap-[0.8vw]">
              <Alliance side="red" m={next} teams={teams} />
              <div className="text-center text-[1.2vw] font-bold text-zinc-500">VS</div>
              <Alliance side="blue" m={next} teams={teams} />
            </div>
          ) : <Big>{matches.length ? 'All Done!' : 'No schedule yet'}</Big>}
        </Card>

        <Card title="Match Timer"><Timer match={next} teams={teams} /></Card>

        <Card title={last ? `Last Result · ${last.id}` : 'Last Result'}>
          {last ? (() => {
            // With a DQ, both alliances can be awarded the win (GG6), so ask the rankings' rule.
            const red = allianceResult(last, 'R')
            const blue = allianceResult(last, 'B')
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
