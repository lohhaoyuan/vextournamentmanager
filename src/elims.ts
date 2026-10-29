import { isPlayed, type ElimMatch, type Elims, type Match, type Round } from './types'

/** <T14> How many Alliances an event with this many Teams should have. */
export function allianceCount(teams: number) {
  return teams >= 32 ? 16 : teams >= 24 ? 12 : teams >= 16 ? 8 : Math.floor(teams / 2)
}

/**
 * Alliance Selection, worked out from the invitations so far.
 * The captain is always the best-ranked Team not yet on an Alliance. <T16> A Team that declines
 * can't be invited again, but can still become a captain. Selection ends when every Alliance is
 * formed, or early (with fewer Alliances) when the captain has nobody left to invite.
 */
export function selection({ size, order, invites }: Pick<Elims, 'size' | 'order' | 'invites'>) {
  const alliances: [string, string][] = []
  const declined = new Set<string>()
  const taken = new Set<string>()
  const nextCaptain = () => (alliances.length < size ? order.find((t) => !taken.has(t)) : undefined)
  for (const { team, accepted } of invites) {
    const captain = nextCaptain()
    if (accepted && captain) {
      alliances.push([captain, team])
      taken.add(captain).add(team)
    } else declined.add(team)
  }
  const captain = nextCaptain()
  const available = captain ? order.filter((t) => t !== captain && !taken.has(t) && !declined.has(t)) : []
  return { alliances, declined, captain, available, done: !available.length }
}

export const ROUNDS: Round[] = ['R16', 'QF', 'SF', 'F']
export const ROUND_NAME: Record<Round, string> = { R16: 'Round of 16', QF: 'Quarterfinals', SF: 'Semifinals', F: 'Finals' }

/** <T17> Round of 16 pairings, top to bottom of Figure T17-1. Later rounds pair neighbouring winners. */
const R16 = [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]

/** The first round that is played: smaller events start later in the 16-Alliance bracket, with Byes. */
export const firstRound = (alliances: number): Round =>
  alliances > 8 ? 'R16' : alliances > 4 ? 'QF' : alliances > 2 ? 'SF' : 'F'

export const matchId = (round: Round, slot: number, instance: number) => `${round} #${slot}-${instance}`

/** Who won one Elimination Match: red, blue, a tie, or X for no result (both Alliances Disqualified). */
export function elimResult(m: Match): 'R' | 'B' | 'T' | 'X' {
  // <GG6> A Disqualified Team takes its whole Alliance with it. If both Alliances are
  // Disqualified, both lose and another Match is played.
  const redDQ = m.red.some((t) => m.dq?.includes(t))
  const blueDQ = m.blue.some((t) => m.dq?.includes(t))
  if (redDQ || blueDQ) return redDQ && blueDQ ? 'X' : redDQ ? 'B' : 'R'
  return m.redScore! > m.blueScore! ? 'R' : m.blueScore! > m.redScore! ? 'B' : 'T'
}

/**
 * Decides a round from its results so far, or returns undefined when another Match is needed.
 * Red is the higher seed. <T18> <T19>
 */
export function decide(results: ReturnType<typeof elimResult>[], bestOf: 1 | 3, finals: boolean): 'R' | 'B' | undefined {
  const r = results.filter((x) => x === 'R').length
  const b = results.filter((x) => x === 'B').length
  const ties = results.filter((x) => x === 'T').length
  if (bestOf === 1) {
    if (r || b) return r ? 'R' : 'B'
    // The higher seed advances after two ties, or three in the Finals.
    return ties >= (finals ? 3 : 2) ? 'R' : undefined
  }
  if (r >= 2 || b >= 2) return r >= 2 ? 'R' : 'B'
  if (r + b === 0 && ties >= 3) return 'R'
  if (r + b === 1 && ties >= 2) return r ? 'R' : 'B' // 1-0: the Alliance with the win
  if (r === 1 && b === 1 && ties >= 2) return 'R'
  return undefined
}

/** An Alliance number, null when nobody can come from there (a Bye), or undefined while it isn't decided yet. */
export type Side = number | null | undefined

export interface Series {
  round: Round
  slot: number
  /** Red then blue once both are known; until then, top feeder then bottom feeder. */
  sides: [Side, Side]
  /** Played Matches plus the one up next, if the round isn't over. */
  matches: ElimMatch[]
  bestOf: 1 | 3
  wins: [number, number]
  winner: Side
}

function playSeries(round: Round, slot: number, a: Side, b: Side, e: Elims, alliances: [string, string][]): Series {
  const bestOf = round === 'F' ? e.finalsBestOf : 1
  const series: Series = { round, slot, sides: [a, b], matches: [], bestOf, wins: [0, 0], winner: undefined }
  if (a === undefined || b === undefined) return series
  if (a === null || b === null) return { ...series, winner: a ?? b }
  const [red, blue] = a < b ? [a, b] : [b, a]
  series.sides = [red, blue]
  const results: ReturnType<typeof elimResult>[] = []
  for (let k = 1; ; k++) {
    const id = matchId(round, slot, k)
    // A result only counts if it was played by these two Alliances; an earlier round may have been re-scored since.
    const saved = e.results[id]
    const { red: _r, blue: _b, ...result } = saved?.red === red && saved.blue === blue ? saved : { red, blue }
    const m: ElimMatch = {
      id, round, slot, instance: k, seeds: [red, blue],
      red: alliances[red - 1], blue: alliances[blue - 1], redAWP: false, blueAWP: false, ...result,
    }
    series.matches.push(m)
    if (!isPlayed(m)) return series
    const res = elimResult(m)
    results.push(res)
    if (res === 'R') series.wins[0]++
    if (res === 'B') series.wins[1]++
    const won = decide(results, bestOf, round === 'F')
    if (won) return { ...series, winner: won === 'R' ? red : blue }
  }
}

/**
 * The whole bracket from the Alliances and the results so far. `matches` is in playing order:
 * round by round, and within a round all first Matches before any rematches.
 */
export function bracket(e: Elims, alliances: [string, string][]) {
  const series: Series[] = []
  let feeders: Side[] = R16.map((seed) => (seed <= alliances.length ? seed : null))
  for (const round of ROUNDS) {
    const winners: Side[] = []
    for (let i = 0; i < feeders.length; i += 2) {
      const s = playSeries(round, i / 2 + 1, feeders[i], feeders[i + 1], e, alliances)
      series.push(s)
      winners.push(s.winner)
    }
    feeders = winners
  }
  const matches = series.flatMap((s) => s.matches).sort((x, y) =>
    ROUNDS.indexOf(x.round) - ROUNDS.indexOf(y.round) || x.instance - y.instance || x.slot - y.slot)
  return { alliances, series, matches, champion: feeders[0] ?? undefined, first: firstRound(alliances.length) }
}

export type Bracket = ReturnType<typeof bracket>
