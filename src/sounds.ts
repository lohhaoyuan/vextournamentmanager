// Synthesised imitations of the VEX field sounds (the real recordings aren't bundled):
// five short "dun"s when a period starts and a harsh buzzer when it ends.

function tone(ctx: BaseAudioContext, type: OscillatorType, freqs: number[], secs: number, peak: number, lowpassHz: number, delay = 0) {
  const t = ctx.currentTime + delay
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.01)
  gain.gain.setValueAtTime(peak, t + secs - 0.06)
  gain.gain.linearRampToValueAtTime(0, t + secs)

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = lowpassHz
  gain.connect(filter).connect(ctx.destination)

  for (const f of freqs) {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = f
    osc.connect(gain)
    osc.start(t)
    osc.stop(t + secs)
  }
}

/** Period start: dun dun dun dun dun. */
export function playStart(ctx: BaseAudioContext) {
  for (let i = 0; i < 5; i++) tone(ctx, 'square', [523.25, 1046.5], 0.14, 0.12, 3000, i * 0.2)
}

/** Period end: a buzzer made of slightly detuned low sawtooths, so they beat and rasp. */
export const playBuzzer = (ctx: BaseAudioContext) => tone(ctx, 'sawtooth', [110, 116.5, 220, 233], 1.3, 0.16, 2200)
