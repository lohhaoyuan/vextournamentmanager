import { useSyncExternalStore } from 'react'
import { archive, scrimData, type Scrim } from './scrims'
import type { EventData } from './types'

// All state lives in localStorage. Other tabs (e.g. /display) hear about changes
// through the storage event and a BroadcastChannel, whichever arrives first.
function persisted<T>(key: string, empty: T, fix: (stored: T) => T) {
  const load = (): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? fix(JSON.parse(raw)) : empty
    } catch {
      return empty
    }
  }
  let state = load()
  const listeners = new Set<() => void>()
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null
  const emit = () => listeners.forEach((l) => l())
  const reload = () => {
    state = load()
    emit()
  }
  window.addEventListener('storage', (e) => e.key === key && reload())
  channel?.addEventListener('message', reload)

  return {
    get: () => state,
    set(update: T | ((prev: T) => T)) {
      state = update instanceof Function ? update(state) : update
      localStorage.setItem(key, JSON.stringify(state))
      channel?.postMessage('changed')
      emit()
    },
    subscribe: (l: () => void) => (listeners.add(l), () => void listeners.delete(l)),
  }
}

const event = persisted<EventData>('vex-scrimmage', { teams: [], matches: [] }, (ev) => ({ ...ev, teams: ev.teams ?? [], matches: ev.matches ?? [] }))
const history = persisted<Scrim[]>('vex-history', [], (h) => (Array.isArray(h) ? h : []))

export const getEvent = event.get
export const useEvent = () => useSyncExternalStore(event.subscribe, event.get)
export const useHistory = () => useSyncExternalStore(history.subscribe, history.get)
export const setHistory = history.set

export function setEvent(update: EventData | ((prev: EventData) => EventData)) {
  event.set((prev) => ({ ...(update instanceof Function ? update(prev) : update), updatedAt: Date.now() }))
}

/** Files the current scrim in History (if anything was played) and starts an empty one. */
export function startNewScrim(keepTeams: boolean, name: string) {
  const ev = event.get()
  history.set((h) => archive(ev, h))
  setEvent({ teams: keepTeams ? ev.teams : [], matches: [], name: name.trim() || undefined })
}

/** Makes a scrim from History the current one, filing the current one in its place. */
export function reopenScrim(id: string) {
  const scrim = history.get().find((s) => s.id === id)
  if (!scrim) return
  history.set((h) => archive(event.get(), h.filter((s) => s.id !== id)))
  event.set(scrimData(scrim))
}

export function downloadFile(filename: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportJSON(data: EventData = event.get(), filename = 'vex-scrimmage.json') {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json')
}

/** Loads a scrim file as the current scrim, filing the current one in History first. */
export async function importJSON(file: File) {
  const data = JSON.parse(await file.text())
  if (!Array.isArray(data.teams) || !Array.isArray(data.matches)) throw new Error('Not a scrimmage file')
  history.set((h) => archive(event.get(), h))
  setEvent({ teams: data.teams, matches: data.matches, name: data.name, elims: data.elims })
}
