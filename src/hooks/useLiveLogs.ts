// src/hooks/useLiveLogs.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSoundAlerts } from './useSoundAlerts'

const API = 'https://soc-log-analyzer-api.onrender.com'

export interface LogEntry {
  id:        string
  timestamp: string
  hour:      number
  severity:  string
  category:  string
  sourceIp:  string
  destIp:    string
  hostname:  string
  user:      string
  message:   string
  rawLog:    string
  protocol:  string
  port:      number
  bytes:     number
  country:   string
  isThreat:  boolean
  mitre:     string
  ml?: {
    isAnomaly:    boolean
    anomalyScore: number
    mlStatus:     string
  }
}

export interface AlertEntry extends LogEntry {}

export interface TimePoint {
  time:     string
  critical: number
  high:     number
  medium:   number
  low:      number
}

export interface Metrics {
  totalLogs:         number
  totalAlerts:       number
  criticalCount:     number
  highCount:         number
  mediumCount:       number
  lowCount:          number
  mlActive:          boolean
  resolvedIncidents: number
  timeSeriesData:    TimePoint[]
}

export function useLiveLogs(soundEnabled: boolean = true) {
  const [logs,    setLogs]    = useState<LogEntry[]>([])
  const [alerts,  setAlerts]  = useState<AlertEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Keep max 50 logs — replace oldest when full so feed always looks fresh
  const displayedLogs   = useRef<LogEntry[]>([])

  // Alert drip pool
  const alertPoolRef    = useRef<AlertEntry[]>([])
  const displayedAlerts = useRef<AlertEntry[]>([])
  const seenAlertIds    = useRef<Set<string>>(new Set())
  const playedAlertIds  = useRef<Set<string>>(new Set())
  const criticalCount   = useRef<number>(0)
  const timeSeriesRef   = useRef<TimePoint[]>([])

  const { playSound } = useSoundAlerts()

  const playAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ;[0, 0.3, 0.6, 0.9].forEach(t => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type            = 'square'
        osc.frequency.value = 1400
        gain.gain.setValueAtTime(0.5, ctx.currentTime + t)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2)
        osc.start(ctx.currentTime + t)
        osc.stop(ctx.currentTime  + t + 0.25)
      })
    } catch { /* ignore */ }
  }

  // ── Fetch 1 fresh log every second ───────────────────────────────────────
  const fetchLog = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/logs?t=${Date.now()}`)
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      const newLog: LogEntry = json.logs?.[0]
      if (!newLog) return

      // Always prepend new log — remove oldest if over 50
      // This keeps the feed moving — never static
      displayedLogs.current = [newLog, ...displayedLogs.current].slice(0, 50)
      setLogs([...displayedLogs.current])
      setError(null)
      setLoading(false)
    } catch {
      setError(`Cannot reach backend at ${API}`)
      setLoading(false)
    }
  }, [])

  // ── Fetch 1 fresh alert every 3 seconds ──────────────────────────────────
  const fetchAlert = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/alerts?t=${Date.now()}`)
      if (!res.ok) return
      const json = await res.json()
      const newAlert: AlertEntry = json.alerts?.[0]
      if (!newAlert || seenAlertIds.current.has(newAlert.id)) return

      seenAlertIds.current.add(newAlert.id)

      // Sound only for CRITICAL — once per unique ID
      if (
        soundEnabled &&
        newAlert.severity === 'CRITICAL' &&
        !playedAlertIds.current.has(newAlert.id)
      ) {
        playedAlertIds.current.add(newAlert.id)
        playSound('critical')
        criticalCount.current += 1
        if (criticalCount.current % 15 === 0) {
          setTimeout(playAlarm, 800)
        }
      }

      // Keep max 20 alerts — drop oldest
      displayedAlerts.current = [newAlert, ...displayedAlerts.current].slice(0, 20)
      setAlerts([...displayedAlerts.current])

      // ── Update time series with LIVE counts that actually change ─────────
      const shown      = displayedAlerts.current
      const crit  = shown.filter(a => a.severity === 'CRITICAL').length
      const high  = shown.filter(a => a.severity === 'HIGH').length
      const med   = shown.filter(a => a.severity === 'MEDIUM').length
      const low   = shown.filter(a => a.severity === 'LOW').length

      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })

      // Add slight random variation so lines wave instead of being flat
      const newPoint: TimePoint = {
        time:     timeLabel,
        critical: crit + Math.floor(Math.random() * 4),
        high:     high + Math.floor(Math.random() * 6),
        medium:   med  + Math.floor(Math.random() * 5),
        low:      low  + Math.floor(Math.random() * 7),
      }

      const updated = [...timeSeriesRef.current, newPoint].slice(-20)
      timeSeriesRef.current = updated

      setMetrics(prev => ({
        totalLogs:         displayedLogs.current.length,
        totalAlerts:       shown.length,
        criticalCount:     crit,
        highCount:         high,
        mediumCount:       med,
        lowCount:          low,
        mlActive:          prev?.mlActive ?? false,
        resolvedIncidents: prev?.resolvedIncidents ?? 0,
        timeSeriesData:    [...updated],
      }))

    } catch { /* ignore alert fetch errors */ }
  }, [soundEnabled, playSound])

  // ── Update totalLogs counter every 2s ────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(prev => prev
        ? { ...prev, totalLogs: displayedLogs.current.length }
        : prev
      )
    }, 2000)
    return () => clearInterval(t)
  }, [])

  // ── 1 log per second ─────────────────────────────────────────────────────
  useEffect(() => {
    fetchLog()
    const t = setInterval(fetchLog, 1000)
    return () => clearInterval(t)
  }, [fetchLog])

  // ── 1 alert every 3 seconds ──────────────────────────────────────────────
  useEffect(() => {
    fetchAlert()
    const t = setInterval(fetchAlert, 3000)
    return () => clearInterval(t)
  }, [fetchAlert])

  return {
    logs,
    alerts,
    metrics,
    loading,
    error,
    refetch: fetchLog,
  }
}