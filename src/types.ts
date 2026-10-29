export interface Team {
  number: string
  name: string
}

export type Auton = 'R' | 'B' | 'D' | null

export interface Match {
  id: string
  red: [string, string]
  blue: [string, string]
  redScore?: number
  blueScore?: number
  auton?: Auton
  redAWP: boolean
  blueAWP: boolean
  /** Team numbers appearing as surrogates in this match; their result doesn't count for them. */
  surrogates?: string[]
  /** Skipped matches are passed over by Up Next and never count, even if scores were entered. */
  skipped?: boolean
  /** Team numbers Disqualified in this match (rule GG6; see rankings.ts). */
  dq?: string[]
}

export interface EventData {
  teams: Team[]
  matches: Match[]
}

export const isPlayed = (m: Match) => !m.skipped && m.redScore != null && m.blueScore != null

/** "8076Y - Chonky", or just the number if the team isn't in the list. */
export function teamLabel(number: string, teams: Team[]) {
  const name = teams.find((t) => t.number === number)?.name
  return name ? `${number} - ${name}` : number
}
