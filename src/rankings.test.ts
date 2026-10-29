import { describe, expect, it } from 'vitest'
import { computeRankings } from './rankings'
import type { Match } from './types'

const match = (id: string, red: [string, string], blue: [string, string], extra: Partial<Match> = {}): Match => ({
  id, red, blue, auton: null, redAWP: false, blueAWP: false, ...extra,
})
const byTeam = (rows: ReturnType<typeof computeRankings>) => Object.fromEntries(rows.map((r) => [r.team, r]))

describe('computeRankings', () => {
  it('counts wins, losses and SP from the losing score', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 30, blueScore: 20 })]))
    expect(r.A).toMatchObject({ w: 1, l: 0, t: 0, wp: 2, sp: 20, high: 30 })
    expect(r.C).toMatchObject({ w: 0, l: 1, t: 0, wp: 0, sp: 20, high: 20 })
  })

  it('handles ties', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 15, blueScore: 15 })]))
    for (const t of ['A', 'B', 'C', 'D']) expect(r[t]).toMatchObject({ t: 1, wp: 1, sp: 15, rank: 1 })
  })

  it('gives both alliances auton tie points', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5, auton: 'D' })]))
    expect(r.A.ap).toBe(3)
    expect(r.C.ap).toBe(3)
  })

  it('gives auton win points only to the winner', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5, auton: 'B' })]))
    expect(r.A.ap).toBe(0)
    expect(r.C.ap).toBe(6)
  })

  it('adds AWP to WP, even in a loss', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5, redAWP: true, blueAWP: true })]))
    expect(r.A.wp).toBe(3)
    expect(r.C.wp).toBe(1)
  })

  it('ignores unplayed and half-entered matches', () => {
    const r = byTeam(computeRankings(['E'], [
      match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5 }),
      match('Q2', ['A', 'B'], ['C', 'D'], { redScore: 0 }),
      match('Q3', ['A', 'B'], ['C', 'D']),
    ]))
    expect(r.A).toMatchObject({ played: 1, w: 1, wp: 2 })
    expect(r.E).toMatchObject({ played: 0, wp: 0 })
  })

  it('averages over matches played and tracks the two best scores', () => {
    const r = byTeam(computeRankings([], [
      match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 40, blueScore: 10 }),
      match('Q2', ['A', 'C'], ['B', 'D'], { redScore: 20, blueScore: 30 }),
      match('Q3', ['A', 'D'], ['B', 'C'], { redScore: 25, blueScore: 25 }),
    ]))
    expect(r.A).toMatchObject({ w: 1, l: 1, t: 1, high: 40, high2: 25 })
    expect(r.A.wp).toBeCloseTo(3 / 3)
    expect(r.A.sp).toBeCloseTo((10 + 20 + 25) / 3)
  })

  it('ignores skipped matches even if scores were entered', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5, skipped: true })]))
    expect(r.A).toMatchObject({ played: 0, w: 0, wp: 0 })
  })

  describe('disqualifications (GG6)', () => {
    const dqMatch = (red: number, blue: number, dq: string[], extra: Partial<Match> = {}) =>
      byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: red, blueScore: blue, dq, ...extra })]))

    it('gives the DQed team a score of 0, no WP/AP/SP/AWP, and a loss that still counts as played', () => {
      const r = dqMatch(30, 10, ['A'], { auton: 'R', redAWP: true })
      expect(r.A).toMatchObject({ played: 1, w: 0, l: 1, t: 0, wp: 0, ap: 0, sp: 0, high: 0 })
    })

    it('leaves the partner unaffected, keeping its win, AP and AWP', () => {
      const r = dqMatch(30, 10, ['A'], { auton: 'R', redAWP: true })
      expect(r.B).toMatchObject({ w: 1, wp: 3, ap: 6, sp: 10, high: 30 })
    })

    it('gives the opposing alliance the win when the DQed team was on the winning alliance', () => {
      const r = dqMatch(30, 10, ['A'])
      expect(r.C).toMatchObject({ w: 1, l: 0, wp: 2 })
      expect(r.D).toMatchObject({ w: 1, l: 0, wp: 2 })
    })

    it('does not hand AWP to the opponents', () => {
      const r = dqMatch(30, 10, ['A'], { redAWP: true })
      expect(r.C.wp).toBe(2)
    })

    it('turns a tie into a win for the opponents; the partner keeps the tie', () => {
      const r = dqMatch(20, 20, ['A'])
      expect(r.C).toMatchObject({ w: 1, wp: 2 })
      expect(r.B).toMatchObject({ t: 1, wp: 1 })
    })

    it('changes nothing for others when the DQed team was on the losing alliance', () => {
      const r = dqMatch(30, 10, ['C'])
      expect(r.A).toMatchObject({ w: 1, wp: 2 })
      expect(r.D).toMatchObject({ l: 1, wp: 0 })
    })

    it('gives every non-DQed team a tie when both alliances have a DQ', () => {
      const r = dqMatch(30, 10, ['A', 'C'])
      expect(r.B).toMatchObject({ t: 1, w: 0, l: 0, wp: 1 })
      expect(r.D).toMatchObject({ t: 1, w: 0, l: 0, wp: 1 })
      expect(r.A).toMatchObject({ l: 1, wp: 0 })
    })
  })

  it('does not count surrogate appearances', () => {
    const r = byTeam(computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5, surrogates: ['A'] })]))
    expect(r.A.played).toBe(0)
    expect(r.B.played).toBe(1)
  })

  it('sorts by WP, AP, SP, High, 2nd High and shares ranks on full ties', () => {
    const rows = computeRankings([], [
      match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5, auton: 'R' }),
      match('Q2', ['A', 'C'], ['B', 'D'], { redScore: 8, blueScore: 3 }),
    ])
    // A: 2 wins. B and C: 1 win each with equal everything except AP (B won auton in Q1, C didn't).
    expect(rows.map((r) => [r.team, r.rank])).toEqual([['A', 1], ['B', 2], ['C', 3], ['D', 4]])

    const tied = computeRankings([], [match('Q1', ['A', 'B'], ['C', 'D'], { redScore: 10, blueScore: 5 })])
    expect(tied.map((r) => r.rank)).toEqual([1, 1, 3, 3])
  })
})
