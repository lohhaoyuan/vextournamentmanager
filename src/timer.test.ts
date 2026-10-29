import { describe, expect, it } from 'vitest'
import { msToNextChange, timerState } from './timer'

// Shown number = Math.ceil(remaining), as in the Timer component.
const shown = (period: 'auton' | 'driver', secs: number) => {
  const s = timerState({ period, startedAt: 1000 }, 1000 + secs * 1000)
  return `${s.stage} ${Math.ceil(s.remaining)}`
}

describe('timerState', () => {
  it('is idle with no run', () => {
    expect(timerState(null, 5000).stage).toBe('idle')
  })

  it('counts 3-2-1 then runs a full 15 s auton and stops', () => {
    expect(shown('auton', 0)).toBe('countdown 3')
    expect(shown('auton', 0.999)).toBe('countdown 3')
    expect(shown('auton', 1)).toBe('countdown 2')
    expect(shown('auton', 2.999)).toBe('countdown 1')
    expect(shown('auton', 3)).toBe('running 15')
    expect(shown('auton', 3.999)).toBe('running 15')
    expect(shown('auton', 4)).toBe('running 14')
    expect(shown('auton', 17.999)).toBe('running 1')
    expect(shown('auton', 18)).toBe('over 0')
    expect(shown('auton', 600)).toBe('over 0') // waits for Start Driver however long it takes
  })

  it('runs a full 1:45 driver period after its own countdown', () => {
    expect(shown('driver', 2.5)).toBe('countdown 1')
    expect(shown('driver', 3)).toBe('running 105')
    expect(shown('driver', 107.999)).toBe('running 1')
    expect(shown('driver', 108)).toBe('over 0')
  })
})

describe('msToNextChange', () => {
  it('waits exactly until the next whole second', () => {
    expect(msToNextChange(14.25)).toBeCloseTo(250)
    expect(msToNextChange(3)).toBe(1000)
  })
})
