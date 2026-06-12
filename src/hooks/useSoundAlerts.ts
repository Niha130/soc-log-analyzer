// src/hooks/useSoundAlerts.ts
// Plays browser sounds when Critical or High alerts arrive
// Uses the Web Audio API — no library needed

export function useSoundAlerts() {

  const playSound = (type: 'critical' | 'high') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

      if (type === 'critical') {
        // Three sharp beeps for critical
        [0, 0.25, 0.5].forEach(startAt => {
          const osc  = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type      = 'square'
          osc.frequency.value = 1200
          gain.gain.setValueAtTime(0.4, ctx.currentTime + startAt)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + 0.18)
          osc.start(ctx.currentTime + startAt)
          osc.stop(ctx.currentTime + startAt + 0.2)
        })
      } else {
        // Single lower beep for high
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type      = 'sine'
        osc.frequency.value = 800
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.45)
      }
    } catch {
      // Browser may block AudioContext before user interaction — silently ignore
    }
  }

  return { playSound }
}
