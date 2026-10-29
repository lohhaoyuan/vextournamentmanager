import startUrl from './assets/sounds/start.mp3'
import autonEndUrl from './assets/sounds/auton-end.mp3'
import warningUrl from './assets/sounds/warning.mp3'
import matchEndUrl from './assets/sounds/match-end.mp3'

// The VEX Tournament Manager field sounds, cut from a recording of them.
const URLS = { start: startUrl, autonEnd: autonEndUrl, warning: warningUrl, matchEnd: matchEndUrl }
export type SoundName = keyof typeof URLS

// Decoded once. Each remembers where its first audible sample is, so silent padding at the
// front of the MP3 never makes it late.
const sounds: Partial<Record<SoundName, { buffer: AudioBuffer; offset: number }>> = {}

export async function loadSounds() {
  const decoder = new OfflineAudioContext(1, 1, 48000) // decodes without needing a click first
  await Promise.all(
    (Object.keys(URLS) as SoundName[]).map(async (name) => {
      const buffer = await decoder.decodeAudioData(await (await fetch(URLS[name])).arrayBuffer())
      const data = buffer.getChannelData(0)
      let i = 0
      while (i < data.length && Math.abs(data[i]) < 0.003) i++
      sounds[name] = { buffer, offset: i / buffer.sampleRate }
    }),
  )
}

/** Plays `name` starting at audio-clock time `at`. Returns its node; disconnect it to cancel. */
export function play(ctx: AudioContext, name: SoundName, at: number): AudioNode[] {
  const s = sounds[name]
  if (!s) return []
  const src = ctx.createBufferSource()
  src.buffer = s.buffer
  src.connect(ctx.destination)
  const late = Math.max(0, ctx.currentTime - at) // if booked a moment late, skip ahead rather than play late
  src.start(at + late, s.offset + late)
  return [src]
}

/**
 * The audio-clock time to start a sound so it is *heard* at `perfMs` (a performance.now() time).
 * getOutputTimestamp includes the speaker/HDMI delay the browser knows about; the fallback uses outputLatency.
 */
export function audioTimeAt(ctx: AudioContext, perfMs: number) {
  const ts = ctx.getOutputTimestamp?.()
  if (ts?.performanceTime && ts.contextTime != null) return ts.contextTime + (perfMs - ts.performanceTime) / 1000
  return ctx.currentTime + (perfMs - performance.now()) / 1000 - (ctx.outputLatency || 0)
}
