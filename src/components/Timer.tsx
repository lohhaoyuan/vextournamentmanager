import { useEffect, useRef, useState } from 'react'
import { settings } from '../settings'
import { playBuzzer, playStart } from '../sounds'

const { countdownSeconds, autonSeconds, pauseSeconds, driverSeconds } = settings.timer

interface Phase {
  label: string
  secs: number
  countdown?: boolean // show 3, 2, 1 instead of a clock
  sound?: 'start' | 'buzzer' // played as the phase begins
}
const PHASES: Phase[] = [
  { label: 'Get Ready', secs: countdownSeconds, countdown: true },
  { label: 'Autonomous', secs: autonSeconds, sound: 'start' },
  { label: 'Driver Control in', secs: pauseSeconds, countdown: true, sound: 'buzzer' },
  { label: 'Driver Control', secs: driverSeconds, sound: 'start' },
]
const TOTAL = PHASES.reduce((s, p) => s + p.secs, 0)

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Where we are in the match `elapsed` seconds after Start. */
function phaseAt(elapsed: number) {
  let start = 0
  for (const [i, p] of PHASES.entries()) {
    if (elapsed < start + p.secs) return { i, ...p, remaining: Math.ceil(start + p.secs - elapsed) }
    start += p.secs
  }
  return null
}

// Display-only countdown. Not connected to field control.
export default function Timer() {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [beeps, setBeeps] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  const lastTick = useRef('')

  const elapsed = startedAt == null ? -1 : (now - startedAt) / 1000
  const phase = elapsed < 0 ? null : phaseAt(elapsed)
  const done = startedAt != null && elapsed >= TOTAL

  useEffect(() => {
    if (startedAt == null || done) return
    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [startedAt, done])

  // Leaving browser fullscreen (or pressing Esc when the browser refused it) shrinks the timer back.
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFullscreen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false)
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Like the field: start sound when auton/driver begins, buzzer when each ends.
  const key = done ? 'done' : phase ? String(phase.i) : ''
  useEffect(() => {
    if (!key || key === lastTick.current) return
    lastTick.current = key
    const ctx = audio.current
    const sound = done ? 'buzzer' : phase?.sound
    if (!ctx || !beeps || !sound) return
    ;(sound === 'start' ? playStart : playBuzzer)(ctx)
  }, [key])

  const start = () => {
    audio.current ??= new AudioContext()
    audio.current.resume()
    lastTick.current = ''
    setNow(Date.now())
    setStartedAt(Date.now())
  }

  // The timer covers the whole window either way; real browser fullscreen is a bonus where allowed.
  const toggleFullscreen = () => {
    if (fullscreen && document.fullscreenElement) document.exitFullscreen()
    else if (!fullscreen) document.documentElement.requestFullscreen?.().catch(() => {})
    setFullscreen(!fullscreen)
  }

  const label = done ? 'Match Over' : phase?.label ?? 'Ready'
  const big = done ? clock(0) : !phase ? clock(autonSeconds) : phase.countdown ? String(phase.remaining) : clock(phase.remaining)
  const colour = done ? 'text-zinc-500' : phase?.countdown ? 'text-amber-400' : phase && phase.remaining <= 10 ? 'text-alliance-red' : 'text-white'

  return (
    <div className={`flex flex-col items-center justify-center ${fullscreen ? 'fixed inset-0 z-50 bg-zinc-950' : 'h-full bg-zinc-900'}`}>
      <div className={`${fullscreen ? 'text-[5vw]' : 'text-[2.5vw]'} font-semibold uppercase tracking-widest text-zinc-400`}>
        {label}
      </div>
      <div className={`${fullscreen ? 'text-[30vw]' : 'text-[9vw]'} leading-none font-black tabular-nums ${colour}`}>{big}</div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm whitespace-nowrap opacity-60 transition-opacity hover:opacity-100">
        {startedAt == null || done
          ? <button className="btn" onClick={start}>Start</button>
          : <button className="btn" onClick={() => setStartedAt(null)}>Reset</button>}
        <button className="btn" onClick={toggleFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</button>
        <label><input type="checkbox" checked={beeps} onChange={(e) => setBeeps(e.target.checked)} /> Sound</label>
      </div>
    </div>
  )
}
