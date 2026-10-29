import { describe, expect, it } from 'vitest'
import { consecutiveCount, generateSchedule, mulberry32, shuffleMatches } from './schedule'
import type { Match } from './types'

const teamList = (n: number) => Array.from({ length: n }, (_, i) => `${100 + i}A`)

function stats(matches: Match[]) {
  const ranked = new Map<string, number>()
  const side = new Map<string, number>()
  const partners = new Map<string, number>()
  for (const m of matches) {
    expect(new Set([...m.red, ...m.blue]).size).toBe(4) // no team twice in a match
    for (const t of [...m.red, ...m.blue]) {
      if (!m.surrogates?.includes(t)) ranked.set(t, (ranked.get(t) ?? 0) + 1)
    }
    m.red.forEach((t) => side.set(t, (side.get(t) ?? 0) + 1))
    m.blue.forEach((t) => side.set(t, (side.get(t) ?? 0) - 1))
    for (const al of [m.red, m.blue]) {
      const k = [...al].sort().join('|')
      partners.set(k, (partners.get(k) ?? 0) + 1)
    }
  }
  return { ranked, side, partners }
}

describe('generateSchedule', () => {
  it('gives every team the same number of ranked matches', () => {
    for (const [n, per] of [[8, 4], [12, 6], [13, 5], [17, 7], [24, 8]]) {
      const teams = teamList(n)
      const matches = generateSchedule(teams, per, mulberry32(n))
      const { ranked } = stats(matches)
      expect(matches.length).toBe(Math.ceil((n * per) / 4))
      for (const t of teams) expect(ranked.get(t)).toBe(per)
    }
  })

  it('uses marked surrogates for 5 teams and does not count them', () => {
    const teams = teamList(5)
    const matches = generateSchedule(teams, 3, mulberry32(1)) // 15 appearances -> 4 matches, 1 surrogate
    const { ranked } = stats(matches)
    expect(matches.length).toBe(4)
    expect(matches.flatMap((m) => m.surrogates ?? [])).toHaveLength(1)
    for (const t of teams) expect(ranked.get(t)).toBe(3)
  })

  it('avoids back-to-back matches, repeat partners and side imbalance when there is room', () => {
    const teams = teamList(16)
    const matches = generateSchedule(teams, 6, mulberry32(7))
    const { side, partners } = stats(matches)
    expect(consecutiveCount(matches)).toBe(0)
    expect(Math.max(...partners.values())).toBe(1)
    for (const t of teams) expect(Math.abs(side.get(t)!)).toBeLessThanOrEqual(2)
  })

  it('rejects fewer than 4 teams', () => {
    expect(() => generateSchedule(teamList(3), 2)).toThrow()
  })
})

describe('shuffleMatches', () => {
  it('keeps the same matchups, renumbers and clears scores', () => {
    const matches = generateSchedule(teamList(12), 4, mulberry32(3))
      .map((m) => ({ ...m, redScore: 5, blueScore: 3, auton: 'R' as const, redAWP: true }))
    const shuffled = shuffleMatches(matches, mulberry32(9))
    expect(shuffled.map((m) => m.id)).toEqual(matches.map((_, i) => `Q${i + 1}`))
    const key = (m: Match) => [...m.red, ...m.blue].join(',')
    expect(shuffled.map(key).sort()).toEqual(matches.map(key).sort())
    for (const m of shuffled) {
      expect(m.redScore ?? m.blueScore).toBeUndefined()
      expect(m).toMatchObject({ auton: null, redAWP: false, blueAWP: false })
    }
  })
})
