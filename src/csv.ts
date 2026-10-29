import type { Ranking } from './rankings'
import type { Match, Team } from './types'

const cell = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const toCSV = (rows: unknown[][]) => rows.map((r) => r.map(cell).join(',')).join('\n') + '\n'

const AUTON = { R: 'Red', B: 'Blue', D: 'Tie' } as const

export function scheduleCSV(matches: Match[]) {
  const t = (m: Match, team: string) => (m.surrogates?.includes(team) ? `${team}*` : team)
  return toCSV([
    ['Match', 'Red 1', 'Red 2', 'Blue 1', 'Blue 2', 'Red Score', 'Blue Score', 'Auton', 'Red AWP', 'Blue AWP', 'Skipped'],
    ...matches.map((m) => [
      m.id, ...m.red.map((x) => t(m, x)), ...m.blue.map((x) => t(m, x)),
      m.redScore, m.blueScore, m.auton ? AUTON[m.auton] : '', m.redAWP ? 'Y' : '', m.blueAWP ? 'Y' : '', m.skipped ? 'Y' : '',
    ]),
  ])
}

export function rankingsCSV(rankings: Ranking[], teams: Team[]) {
  const name = (n: string) => teams.find((t) => t.number === n)?.name ?? ''
  return toCSV([
    ['Rank', 'Team', 'Name', 'W', 'L', 'T', 'WP', 'AP', 'SP', 'High', '2nd High', 'Played'],
    ...rankings.map((r) => [
      r.rank, r.team, name(r.team), r.w, r.l, r.t,
      r.wp.toFixed(2), r.ap.toFixed(2), r.sp.toFixed(2), r.high, r.high2, r.played,
    ]),
  ])
}
