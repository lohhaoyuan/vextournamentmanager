import { describe, expect, it } from 'vitest'
import { archive, hasPlayed, scrimData, scrimName } from './scrims'
import type { EventData, Match } from './types'

const match = (extra: Partial<Match> = {}): Match => ({ id: 'Q1', red: ['A', 'B'], blue: ['C', 'D'], redAWP: false, blueAWP: false, ...extra })
const day = new Date(2026, 9, 29, 15).getTime()

describe('scrim history', () => {
  it('does not file a scrim where nothing was played', () => {
    const ev: EventData = { teams: [{ number: 'A', name: '' }], matches: [match()] }
    expect(archive(ev, [])).toEqual([])
  })

  it('counts a scored elimination match as played', () => {
    const elims = { size: 2, order: [], invites: [], finalsBestOf: 1 as const, results: { 'F #1-1': { red: 1, blue: 2 } } }
    expect(hasPlayed({ teams: [], matches: [], elims })).toBe(false)
    expect(hasPlayed({ teams: [], matches: [], elims: { ...elims, results: { 'F #1-1': { red: 1, blue: 2, redScore: 1, blueScore: 0 } } } })).toBe(true)
  })

  it('files a played scrim at the front, named by its date unless it has a name', () => {
    const ev: EventData = { teams: [], matches: [match({ redScore: 1, blueScore: 0 })], updatedAt: day }
    const [saved] = archive(ev, [], day + 1000)
    expect(saved.name).toBe(scrimName(ev))
    expect(saved.name).toMatch(/2026/)
    expect(scrimData(saved)).toEqual({ ...ev, name: saved.name })

    const named = archive({ ...ev, name: 'Friday scrim' }, [saved], day + 2000)
    expect(named.map((s) => s.name)).toEqual(['Friday scrim', saved.name])
  })
})
