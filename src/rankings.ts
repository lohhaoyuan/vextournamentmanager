import { isPlayed, type Match } from './types'
import { settings as defaultSettings, type Settings } from './settings'

export interface Ranking {
  rank: number
  team: string
  played: number
  w: number
  l: number
  t: number
  wp: number
  ap: number
  sp: number
  high: number
  high2: number
}

const SORT_KEYS = ['wp', 'ap', 'sp', 'high', 'high2'] as const

/** Ranks every team in `teams` plus any team that appears in the schedule. */
export function computeRankings(
  teams: string[],
  matches: Match[],
  s: Settings = defaultSettings,
): Ranking[] {
  const all = new Set(teams)
  for (const m of matches) [...m.red, ...m.blue].forEach((t) => t && all.add(t))

  const rows = [...all].map((team) => {
    let w = 0, l = 0, t = 0, wpSum = 0, apSum = 0, spSum = 0
    const scores: number[] = []

    for (const m of matches) {
      if (!isPlayed(m) || m.surrogates?.includes(team)) continue
      const side = m.red.includes(team) ? 'R' : m.blue.includes(team) ? 'B' : null
      if (!side) continue

      const own = side === 'R' ? m.redScore! : m.blueScore!
      const opp = side === 'R' ? m.blueScore! : m.redScore!
      const awp = side === 'R' ? m.redAWP : m.blueAWP

      if (own > opp) { w++; wpSum += s.winWP }
      else if (own < opp) l++
      else { t++; wpSum += s.tieWP }
      if (awp) wpSum += s.awpWP

      if (m.auton === side) apSum += s.autonWinAP
      else if (m.auton === 'D') apSum += s.autonTieAP

      spSum += Math.min(own, opp)
      scores.push(own)
    }

    const played = w + l + t
    const avg = (x: number) => (played ? x / played : 0)
    scores.sort((a, b) => b - a)
    return {
      rank: 0, team, played, w, l, t,
      wp: avg(wpSum), ap: avg(apSum), sp: avg(spSum),
      high: scores[0] ?? 0, high2: scores[1] ?? 0,
    }
  })

  const cmp = (a: Ranking, b: Ranking) => {
    for (const k of SORT_KEYS) if (a[k] !== b[k]) return b[k] - a[k]
    return 0
  }
  rows.sort((a, b) => cmp(a, b) || a.team.localeCompare(b.team, undefined, { numeric: true }))
  rows.forEach((r, i) => (r.rank = i > 0 && cmp(rows[i - 1], r) === 0 ? rows[i - 1].rank : i + 1))
  return rows
}
