import { useEffect, useRef, useState } from 'react'
import { settings } from '../settings'

const { autonSeconds, pauseSeconds, driverSeconds } = settings.timer
const PHASES = [
  { label: 'Autonomous', secs: autonSeconds },
  { label: 'Pause', secs: pauseSeconds },
  { label: 'Driver Control', secs: driverSeconds },
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

  const beep = (freq: number, ms: number) => {
    const ctx = audio.current
    if (!ctx || !beeps) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.3
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + ms / 1000)
  }

  // Beep once per whole second: period start (high), last 3 seconds (ticks), period end (low).
  const key = done ? 'done' : phase ? `${phase.i}:${phase.remaining}` : ''
  useEffect(() => {
    if (!key || key === lastTick.current) return
    lastTick.current = key
    if (done) beep(440, 900)
    else if (!phase) return
    else if (phase.label === 'Pause') phase.remaining === phase.secs && beep(440, 700)
    else if (phase.remaining === phase.secs) beep(880, 400)
    else if (phase.remaining <= 3) beep(660, 120)
  }, [key])

  const start = () => {
    audio.current ??= new AudioContext()
    audio.current.resume()
    lastTick.current = ''
    setNow(Date.now())
    setStartedAt(Date.now())
  }

  const label = done ? 'Match Over' : phase?.label ?? 'Ready'
  const time = done ? 0 : phase ? (phase.label === 'Pause' ? PHASES[2].secs : phase.remaining) : autonSeconds
  const colour = done ? 'text-zinc-500' : phase?.label === 'Pause' ? 'text-amber-400' : phase && time <= 10 ? 'text-alliance-red' : 'text-white'

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="text-[2.5vw] font-semibold uppercase tracking-widest text-zinc-400">{label}</div>
      <div className={`text-[9vw] leading-none font-black tabular-nums ${colour}`}>{clock(time)}</div>
      <div className="mt-3 flex items-center gap-3 text-sm opacity-60 transition-opacity hover:opacity-100">
        {startedAt == null || done
          ? <button className="btn" onClick={start}>Start</button>
          : <button className="btn" onClick={() => setStartedAt(null)}>Reset</button>}
        <label><input type="checkbox" checked={beeps} onChange={(e) => setBeeps(e.target.checked)} /> Beeps</label>
      </div>
    </div>
  )
}
