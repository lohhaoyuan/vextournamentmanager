import { settings } from './settings'

export type Period = 'auton' | 'driver'
/** One period of a match: a 3-2-1 countdown, then the period itself. `startedAt` is a performance.now() time. */
export interface Run {
  period: Period
  startedAt: number
}
export type Stage = 'idle' | 'countdown' | 'running' | 'over'

const { countdownSeconds, autonSeconds, driverSeconds } = settings.timer
export const periodSeconds = (p: Period) => (p === 'auton' ? autonSeconds : driverSeconds)

/** What the timer shows at `now` (ms). `remaining` is fractional seconds left in the current stage. */
export function timerState(run: Run | null, now: number): { stage: Stage; remaining: number } {
  if (!run) return { stage: 'idle', remaining: 0 }
  const elapsed = (now - run.startedAt) / 1000
  const end = countdownSeconds + periodSeconds(run.period)
  if (elapsed < countdownSeconds) return { stage: 'countdown', remaining: countdownSeconds - elapsed }
  if (elapsed < end) return { stage: 'running', remaining: end - elapsed }
  return { stage: 'over', remaining: 0 }
}

/** Milliseconds until the whole-second number on screen next changes. */
export const msToNextChange = (remaining: number) => (remaining % 1 || 1) * 1000
