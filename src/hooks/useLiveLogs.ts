// src/hooks/useLiveLogs.ts
// - Streams one new log entry per second into the feed
// - Plays sound once per unique alert ID (HIGH = 1 beep, CRITICAL = 2 beeps)
// - Plays CRITICAL alarm after every 15 cumulative critical alerts

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
  time:    string
  logs:    number
  threats: number
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

  // All fetched logs pooled here — we drip them into display 1/sec
  const logPoolRef        = useRef<LogEntry[]>([])
  const displayedLogsRef  = useRef<LogEntry[]>([])
  const timeSeriesRef     = useRef<TimePoint[]>([])

  // Sound dedup — never play same alert ID twice
  const playedAlertIds    = useRef<Set<string>>(new Set())

  // Critical counter — ring alarm every 15 criticals
  const criticalCountRef  = useRef<number>(0)

  const { playSound } = useSoundAlerts()

  // ── Fetch all logs + alerts from backend ─────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [logsRes, alertsRes] = await Promise.all([
        fetch(`${API}/api/logs`),
        fetch(`${API}/api/alerts`),
      ])
      if (!logsRes.ok || !alertsRes.ok) throw new Error('API error')

      const logsJson   = await logsRes.json()
      const alertsJson = await alertsRes.json()

      const newLogs:   LogEntry[]   = logsJson.logs    || []
      const newAlerts: AlertEntry[] = alertsJson.alerts || []

      // Feed new logs into the pool (avoid duplicates)
      const existingIds = new Set(logPoolRef.current.map(l => l.id))
      const fresh = newLogs.filter(l => !existingIds.has(l.id))
      logPoolRef.current = [...logPoolRef.current, ...fresh]

      // ── Sound: one sound per unique alert ID ────────────────────────────
      if (soundEnabled) {
        for (const alert of newAlerts) {
          if (!playedAlertIds.current.has(alert.id)) {
            playedAlertIds.current.add(alert.id)

            if (alert.severity === 'CRITICAL') {
              playSound('critical')   // 2 beeps
              criticalCountRef.current += 1

              // Every 15 criticals → play a longer alarm sequence
              if (criticalCountRef.current % 15 === 0) {
                setTimeout(() => {
                  try {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
                    // 4-beep alarm sequence
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
                }, 800)  // slight delay after the 2-beep so they don't overlap
              }

            } else if (alert.severity === 'HIGH') {
              playSound('high')       // 1 beep
            }
          }
        }
      }

      // Update alerts + metrics
      const criticalCount = newAlerts.filter(a => a.severity === 'CRITICAL').length
      const highCount     = newAlerts.filter(a => a.severity === 'HIGH').length
      const mediumCount   = newAlerts.filter(a => a.severity === 'MEDIUM').length
      const lowCount      = newAlerts.filter(a => a.severity === 'LOW').length

      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      const newPoint: TimePoint = {
        time:    timeLabel,
        logs:    newLogs.length,
        threats: newAlerts.length,
      }
      const updatedTs = [...timeSeriesRef.current, newPoint].slice(-20)
      timeSeriesRef.current = updatedTs

      setAlerts(newAlerts)
      setMetrics({
        totalLogs:         displayedLogsRef.current.length,
        totalAlerts:       newAlerts.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        mlActive:          newLogs.some(l => l.ml?.mlStatus === 'active'),
        resolvedIncidents: 0,
        timeSeriesData:    [...updatedTs],
      })
      setError(null)
    } catch {
      setError(`Cannot reach backend at ${API}`)
    } finally {
      setLoading(false)
    }
  }, [soundEnabled, playSound])

  // ── Drip one log per second into the display ─────────────────────────────
  useEffect(() => {
    const drip = setInterval(() => {
      if (logPoolRef.current.length === 0) return

      // Take the first log from pool
      const [next, ...rest] = logPoolRef.current
      logPoolRef.current = rest

      // Prepend to displayed logs, keep max 500
      displayedLogsRef.current = [next, ...displayedLogsRef.current].slice(0, 500)

      setLogs([...displayedLogsRef.current])

      // Update totalLogs in metrics
      setMetrics(prev => prev
        ? { ...prev, totalLogs: displayedLogsRef.current.length }
        : prev
      )
    }, 1000)  // one new log every second

    return () => clearInterval(drip)
  }, [])

  // ── Fetch from backend every 10 seconds ──────────────────────────────────
  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 10_000)
    return () => clearInterval(timer)
  }, [fetchAll])

  return { logs, alerts, metrics, loading, error, refetch: fetchAll }
}