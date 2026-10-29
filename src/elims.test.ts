import { describe, expect, it } from 'vitest'
import { allianceCount, bracket, decide, selection } from './elims'
import type { ElimResult, Elims } from './types'

describe('allianceCount (T14)', () => {
  it('follows the table', () => {
    expect([40, 32, 31, 24, 23, 16, 15, 9, 5].map(allianceCount)).toEqual([16, 16, 12, 12, 8, 8, 7, 4, 2])
  })
})

describe('selection (T16)', () => {
  const sel = (order: string, size: number, ...invites: string[]) =>
    selection({ size, order: [...order], invites: invites.map((x) => ({ team: x[0], accepted: x[1] === '+' })) })

  it('lets the best remaining team captain, skipping teams already picked', () => {
    const s = sel('ABCDEF', 3, 'B+')
    expect(s.alliances).toEqual([['A', 'B']])
    expect(s.captain).toBe('C')
    expect(s.available).toEqual(['D', 'E', 'F'])
  })

  it('keeps the same captain after a decline, and the decliner can no longer be invited', () => {
    const s = sel('ABCDEF', 3, 'C-')
    expect(s.captain).toBe('A')
    expect(s.available).toEqual(['B', 'D', 'E', 'F'])
  })

  it('still lets a team that declined become a captain', () => {
    const s = sel('ABCD', 2, 'B-', 'C+')
    expect(s.alliances).toEqual([['A', 'C']])
    expect(s.captain).toBe('B')
    expect(s.available).toEqual(['D'])
  })

  it('ends with fewer Alliances when the captain has nobody left to invite', () => {
    const s = sel('ABCDE', 3, 'B+', 'D-', 'E-')
    expect(s.alliances).toEqual([['A', 'B']])
    expect(s.done).toBe(true)
  })

  it('is done once every Alliance is formed', () => {
    const s = sel('ABCDE', 2, 'B+', 'D+')
    expect(s.alliances).toEqual([['A', 'B'], ['C', 'D']])
    expect([s.captain, s.done]).toEqual([undefined, true])
  })
})

describe('decide (T18, T19)', () => {
  const d = (results: string, bestOf: 1 | 3, finals = bestOf === 3) => decide([...results] as ('R' | 'B' | 'T' | 'X')[], bestOf, finals)

  it('Best of 1: a win advances; the higher seed advances after 2 ties, or 3 in the Finals', () => {
    expect([d('B', 1), d('T', 1), d('TT', 1), d('TT', 1, true), d('TTT', 1, true), d('TB', 1)]).toEqual(['B', undefined, 'R', undefined, 'R', 'B'])
  })

  it('Best of 3: first to two wins, with the T19 tie limits', () => {
    expect(d('RB', 3)).toBeUndefined()
    expect(d('RBB', 3)).toBe('B')
    expect(d('TT', 3)).toBeUndefined()
    expect(d('TTT', 3)).toBe('R') // 0-0 after three ties: higher seed
    expect(d('BTT', 3)).toBe('B') // 1-0 after two ties: the team with the win
    expect(d('TBT', 3)).toBe('B')
    expect(d('RBT', 3)).toBeUndefined()
    expect(d('RBTT', 3)).toBe('R') // 1-1 after two ties: higher seed
  })

  it('does not count a double DQ as a tie', () => {
    expect(d('XT', 1)).toBeUndefined()
  })
})

describe('bracket (T17)', () => {
  const teams = (n: number) => Array.from({ length: n }, (_, i): [string, string] => [`${i + 1}A`, `${i + 1}B`])
  const elims = (results: Record<string, Partial<ElimResult> & { red: number; blue: number }> = {}, finalsBestOf: 1 | 3 = 1): Elims =>
    ({ size: 16, order: [], invites: [], locked: true, finalsBestOf, results })
  const score = (red: number, blue: number, redScore: number, blueScore: number, extra: Partial<ElimResult> = {}) =>
    ({ red, blue, redScore, blueScore, ...extra })
  const sides = (b: ReturnType<typeof bracket>, round: string) => b.series.filter((s) => s.round === round).map((s) => s.sides)

  it('runs 8 Alliances as quarterfinals 1v8, 4v5, 2v7, 3v6', () => {
    const b = bracket(elims(), teams(8))
    expect(b.first).toBe('QF')
    expect(b.matches.map((m) => [m.id, ...m.seeds])).toEqual([['QF #1-1', 1, 8], ['QF #2-1', 4, 5], ['QF #3-1', 2, 7], ['QF #4-1', 3, 6]])
    expect(b.matches[0].red).toEqual(['1A', '1B'])
  })

  it('gives the top seeds Byes with 12 Alliances', () => {
    const b = bracket(elims(), teams(12))
    expect(b.matches.map((m) => m.id)).toEqual(['R16 #2-1', 'R16 #4-1', 'R16 #6-1', 'R16 #8-1'])
    expect(sides(b, 'R16')[0]).toEqual([1, null])
    expect(sides(b, 'QF')[0]).toEqual([1, undefined])
  })

  it('handles 3 and 2 Alliances', () => {
    expect(bracket(elims(), teams(3)).matches.map((m) => [m.id, ...m.seeds])).toEqual([['SF #2-1', 2, 3]])
    expect(bracket(elims(), teams(2)).matches.map((m) => [m.id, ...m.seeds])).toEqual([['F #1-1', 1, 2]])
  })

  it('puts the higher seed on red after an upset', () => {
    const b = bracket(elims({ 'R16 #1-1': score(1, 16, 10, 20), 'R16 #2-1': score(8, 9, 30, 0) }), teams(16))
    expect(sides(b, 'QF')[0]).toEqual([8, 16])
  })

  it('replays a tie after the round\'s other matches, then advances the higher seed after two ties', () => {
    let b = bracket(elims({ 'QF #1-1': score(1, 8, 5, 5) }), teams(8))
    expect(b.matches.map((m) => m.id)).toEqual(['QF #1-1', 'QF #2-1', 'QF #3-1', 'QF #4-1', 'QF #1-2'])
    b = bracket(elims({ 'QF #1-1': score(1, 8, 5, 5), 'QF #1-2': score(1, 8, 7, 7) }), teams(8))
    expect(b.series[8].winner).toBe(1) // QF 1 is the 9th series (after the 8 Round of 16 ones)
  })

  it('takes the whole Alliance out on a DQ, and replays when both are DQed (GG6)', () => {
    const b = bracket(elims({ 'F #1-1': score(1, 2, 50, 10, { dq: ['1B'] }) }), teams(2))
    expect(b.champion).toBe(2)
    const both = bracket(elims({ 'F #1-1': score(1, 2, 50, 10, { dq: ['1B', '2A'] }) }), teams(2))
    expect([both.champion, both.matches.map((m) => m.id)]).toEqual([undefined, ['F #1-1', 'F #1-2']])
  })

  it('plays a Best of 3 Finals to two wins', () => {
    const r = { 'F #1-1': score(1, 2, 9, 3), 'F #1-2': score(1, 2, 3, 9) }
    expect(bracket(elims(r, 3), teams(2)).matches.map((m) => m.id)).toEqual(['F #1-1', 'F #1-2', 'F #1-3'])
    expect(bracket(elims({ ...r, 'F #1-3': score(1, 2, 0, 1) }, 3), teams(2)).champion).toBe(2)
  })

  it('ignores a later result once an earlier round is re-scored with a different winner', () => {
    const r = { 'SF #2-1': score(2, 3, 10, 0), 'F #1-1': score(1, 2, 10, 0) }
    expect(bracket(elims(r), teams(3)).champion).toBe(1)
    const changed = bracket(elims({ ...r, 'SF #2-1': score(2, 3, 0, 10) }), teams(3))
    expect([changed.champion, changed.matches.at(-1)?.seeds, changed.matches.at(-1)?.redScore]).toEqual([undefined, [1, 3], undefined])
  })
})
