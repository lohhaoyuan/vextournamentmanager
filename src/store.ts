import { useSyncExternalStore } from 'react'
import type { EventData } from './types'

// All event state lives in localStorage. Other tabs (e.g. /display) hear about
// changes through the storage event and a BroadcastChannel, whichever arrives.
const KEY = 'vex-scrimmage'
const empty: EventData = { teams: [], matches: [] }

function load(): EventData {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty, ...JSON.parse(raw) } : empty
  } catch {
    return empty
  }
}

let state = load()
const listeners = new Set<() => void>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null
const emit = () => listeners.forEach((l) => l())

function reload() {
  state = load()
  emit()
}
window.addEventListener('storage', (e) => e.key === KEY && reload())
channel?.addEventListener('message', reload)

export function setEvent(update: EventData | ((prev: EventData) => EventData)) {
  state = typeof update === 'function' ? update(state) : update
  localStorage.setItem(KEY, JSON.stringify(state))
  channel?.postMessage('changed')
  emit()
}

export function useEvent(): EventData {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

export function downloadFile(filename: string, text: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function exportJSON() {
  downloadFile('vex-scrimmage.json', JSON.stringify(state, null, 2), 'application/json')
}

export async function importJSON(file: File) {
  const data = JSON.parse(await file.text())
  if (!Array.isArray(data.teams) || !Array.isArray(data.matches)) throw new Error('Not a scrimmage file')
  setEvent({ teams: data.teams, matches: data.matches })
}
