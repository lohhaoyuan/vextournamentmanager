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

export type Round = 'R16' | 'QF' | 'SF' | 'F'

/** An Elimination Match, worked out from the bracket (see elims.ts). Red is always the higher seed. */
export interface ElimMatch extends Match {
  round: Round
  slot: number
  instance: number
  /** Alliance numbers (1 = top seed) of red and blue. */
  seeds: [number, number]
}

/** One invitation during Alliance Selection: the current captain invited `team`, who accepted or declined. */
export interface Invite {
  team: string
  accepted: boolean
}

/** What is stored for a played Elimination Match. `red`/`blue` are the alliance numbers it was played between. */
export type ElimResult = Pick<Match, 'redScore' | 'blueScore' | 'auton' | 'dq'> & { red: number; blue: number }

export interface Elims {
  /** How many Alliances to form (rule T14 suggests a number). */
  size: number
  /** Qualification ranking at the start of Alliance Selection, best first. */
  order: string[]
  invites: Invite[]
  /** Set once Alliance Selection is over and the bracket is being played. */
  locked?: boolean
  finalsBestOf: 1 | 3
  /** Keyed by match id, e.g. "QF #1-1". */
  results: Record<string, ElimResult>
}

export interface EventData {
  teams: Team[]
  matches: Match[]
  /** Scrim name; when empty the date is shown instead. */
  name?: string
  /** Last time anything changed (ms). Decides which day the scrim is filed under in History. */
  updatedAt?: number
  elims?: Elims
}

export const isPlayed = (m: Match) => !m.skipped && m.redScore != null && m.blueScore != null

/** "8076Y - Chonky", or just the number if the team isn't in the list. */
export function teamLabel(number: string, teams: Team[]) {
  const name = teams.find((t) => t.number === number)?.name
  return name ? `${number} - ${name}` : number
}
