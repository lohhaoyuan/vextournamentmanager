import { isPlayed, type EventData } from './types'

/** A finished scrim kept in History. */
export interface Scrim extends EventData {
  id: string
  name: string
  archivedAt: number
}

export const hasPlayed = (ev: EventData) =>
  ev.matches.some(isPlayed) || Object.values(ev.elims?.results ?? {}).some((r) => r.redScore != null && r.blueScore != null)

/** Warning for anything that replaces the current scrim. */
export const replaceNote = (ev: EventData) =>
  hasPlayed(ev) ? 'The current one is saved to History first.' : "Nothing was played in the current one, so it isn't saved."

/** The day a scrim is filed under: the last time anything was changed in it. */
export const scrimDay = (ev: EventData & { archivedAt?: number }) => ev.updatedAt ?? ev.archivedAt ?? Date.now()

export const scrimName = (ev: EventData & { archivedAt?: number }) =>
  ev.name?.trim() || `Scrim ${new Date(scrimDay(ev)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`

/** Adds the scrim to the front of History, unless nothing was played in it. */
export function archive(ev: EventData, history: Scrim[], now = Date.now()): Scrim[] {
  if (!hasPlayed(ev)) return history
  const id = `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return [{ ...ev, updatedAt: ev.updatedAt ?? now, name: scrimName(ev), id, archivedAt: now }, ...history]
}

/** The scrim's own data, without the History bookkeeping (for reopening or downloading). */
export const scrimData = ({ id: _id, archivedAt: _at, ...ev }: Scrim): EventData => ev
