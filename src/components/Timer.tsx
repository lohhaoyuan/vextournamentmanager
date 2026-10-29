import { useEffect, useRef, useState } from 'react'
import { settings } from '../settings'
import { audioTimeAt, loadSounds, play, type SoundName } from '../sounds'
import { msToNextChange, periodSeconds, timerState, type Period, type Run } from '../timer'
import type { Match, Team } from '../types'
import Alliance from './Alliance'

const { countdownSeconds, autonSeconds, warningSecondsLeft } = settings.timer
const NAME = { auton: 'Autonomous', driver: 'Driver Control' }
const PHASE_BG = { auton: 'bg-violet-600', driver: 'bg-emerald-600' }

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Display-only match timer. Not connected to field control.
// Auton: 3-2-1, start sound, 0:15, end-of-auton bells, then it holds until you press Start Driver Control.
// Driver: 3-2-1, start sound, 1:45, warning at 0:30, buzzer at 0:00.
export default function Timer({ match, teams }: { match?: Match; teams: Team[] }) {
  const [run, setRun] = useState<Run | null>(null)
  const [now, setNow] = useState(() => performance.now())
  const [sound, setSound] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const audio = useRef<AudioContext | null>(null)

  const { stage, remaining } = timerState(run, now)
  const ticking = stage === 'countdown' || stage === 'running'

  // Re-render right after the shown second changes. Each wait is worked out fresh from the
  // start time, so errors never add up over the match.
  useEffect(() => {
    if (!ticking) return
    const id = setTimeout(() => setNow(performance.now()), msToNextChange(remaining) + 5)
    return () => clearTimeout(id)
  }, [run, now])

  useEffect(() => {
    loadSounds().then(() => setLoaded(true))
  }, [])

  // Sounds are booked on the audio clock as soon as a period starts, so they land on time
  // even if the page is busy or in the background. Reset or muting cancels them.
  useEffect(() => {
    const ctx = audio.current
    if (!ctx || !sound || !run || !loaded) return
    const elapsed = (performance.now() - run.startedAt) / 1000
    const book = (name: SoundName, secs: number) => (elapsed < secs ? play(ctx, name, audioTimeAt(ctx, run.startedAt + secs * 1000)) : [])
    const end = countdownSeconds + periodSeconds(run.period)
    const nodes = run.period === 'auton'
      ? [...book('start', countdownSeconds), ...book('autonEnd', end)]
      : [...book('start', countdownSeconds), ...book('warning', end - warningSecondsLeft), ...book('matchEnd', end)]
    return () => nodes.forEach((n) => n.disconnect())
  }, [run, sound, loaded])

  // Leaving browser fullscreen (or pressing Esc when the browser refused it) shrinks the timer back.
  // Coming back to a background tab redraws at once (browsers slow timers in hidden tabs).
  // The first click anywhere starts the audio engine, so it is already running when Start is pressed.
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFullscreen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false)
    const onVisible = () => setNow(performance.now())
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pointerdown', getAudio, { once: true })
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pointerdown', getAudio)
    }
  }, [])

  const getAudio = () => {
    audio.current ??= new AudioContext()
    audio.current.resume()
    return audio.current
  }

  const begin = (period: Period) => {
    getAudio()
    const t = performance.now()
    setNow(t)
    setRun({ period, startedAt: t })
  }

  // The timer covers the whole window either way; real browser fullscreen is a bonus where allowed.
  const toggleFullscreen = () => {
    if (fullscreen && document.fullscreenElement) document.exitFullscreen()
    else if (!fullscreen) document.documentElement.requestFullscreen?.().catch(() => {})
    setFullscreen(!fullscreen)
  }

  const autonDone = run?.period === 'auton' && stage === 'over'
  const matchDone = run?.period === 'driver' && stage === 'over'
  const label = !run ? 'Ready'
    : stage === 'countdown' ? `${NAME[run.period]} starts in`
    : stage === 'running' ? NAME[run.period]
    : autonDone ? 'Autonomous Over' : 'Match Over'
  const big = !run ? clock(autonSeconds)
    : stage === 'countdown' ? String(Math.ceil(remaining))
    : stage === 'running' ? clock(Math.ceil(remaining))
    : autonDone ? clock(periodSeconds('driver')) : clock(0)
  const colour = stage === 'countdown' ? 'text-amber-400'
    : stage === 'running' ? (run?.period === 'driver' && remaining <= 10 ? 'text-alliance-red' : 'text-white')
    : run ? 'text-zinc-500' : 'text-white'

  // Step tracker: each period is to-do, live or done.
  const step = (p: Period) =>
    !run || (p === 'driver' && run.period === 'auton') ? 'todo'
    : p === run.period && stage !== 'over' ? 'live' : 'done'

  const fs = (normal: string, full: string) => (fullscreen ? full : normal)

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 flex flex-col gap-[2vw] bg-zinc-950 p-[2vw]' : 'h-full'}>
      {fullscreen && match && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[2vw]">
          <Alliance side="red" m={match} teams={teams} big />
          <div className="text-[3vw] font-black text-zinc-400">{match.id}</div>
          <Alliance side="blue" m={match} teams={teams} big />
        </div>
      )}
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className={`flex gap-[0.5vw] ${fs('text-[0.9vw]', 'text-[1.8vw]')} font-bold uppercase`}>
          {(['auton', 'driver'] as const).map((p) => (
            <span key={p} className={`rounded-full px-[0.8vw] py-[0.15vw] ${
              step(p) === 'live' ? `${PHASE_BG[p]} text-white` : step(p) === 'done' ? 'bg-zinc-800 text-zinc-400' : 'text-zinc-600 ring-1 ring-zinc-700'}`}>
              {step(p) === 'done' && '✓ '}{NAME[p]}
            </span>
          ))}
        </div>
        <div className={`mt-[0.6vw] ${fs('text-[2vw]', 'text-[4.5vw]')} font-bold uppercase tracking-wider text-zinc-300`}>{label}</div>
        <div className={`${fs('text-[8vw]', 'text-[22vw]')} leading-none font-black tabular-nums ${colour}`}>{big}</div>
        <div className="mt-[0.8vw] flex flex-wrap items-center justify-center gap-2 text-sm whitespace-nowrap">
          {(!run || matchDone) && <button className="btn bg-violet-600! text-white" onClick={() => begin('auton')}>Start Autonomous</button>}
          {autonDone && <button className="btn bg-emerald-600! text-white" onClick={() => begin('driver')}>Start Driver Control</button>}
          {run && <button className="btn opacity-70" onClick={() => setRun(null)}>Reset</button>}
          <button className="btn opacity-70" onClick={toggleFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
          <label className="opacity-70"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sound</label>
        </div>
      </div>
    </div>
  )
}
