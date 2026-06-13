// src/hooks/useSoundAlerts.ts
// 1 beep = HIGH, 2 beeps = CRITICAL, triggered once per unique alert ID

export function useSoundAlerts() {

  const playBeep = (freq: number, startAt: number, ctx: AudioContext) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type            = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.35, ctx.currentTime + startAt)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + 0.3)
    osc.start(ctx.currentTime + startAt)
    osc.stop(ctx.currentTime  + startAt + 0.35)
  }

  const playSound = (type: 'critical' | 'high') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

      if (type === 'critical') {
        // 2 beeps for CRITICAL
        playBeep(1100, 0.0,  ctx)
        playBeep(1100, 0.45, ctx)
      } else {
        // 1 beep for HIGH
        playBeep(800, 0.0, ctx)
      }
    } catch {
      // Browser blocked AudioContext before user interaction — ignore silently
    }
  }

  return { playSound }
}