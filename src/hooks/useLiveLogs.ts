// src/hooks/useLiveLogs.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSoundAlerts } from './useSoundAlerts'

const API = 'http://localhost:8000'

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
  anomaly?:  boolean
}

export interface AlertEntry extends LogEntry {}

export interface TimePoint {
  time:     string
  total:    number
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
  const [logs,       setLogs]       = useState<LogEntry[]>([])
  const [alerts,     setAlerts]     = useState<AlertEntry[]>([])
  const [metrics,    setMetrics]    = useState<Metrics | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const allLogsRef    = useRef<LogEntry[]>([])
  const seenAlertIds  = useRef<Set<string>>(new Set())
  const soundedIds    = useRef<Set<string>>(new Set())
  const timeSeriesRef = useRef<TimePoint[]>([])
  const { playSound } = useSoundAlerts()

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

     // ── Add only 1 new log per fetch ────────────────────────────────
const existingIds = new Set(allLogsRef.current.map(l => l.id))
const addedLogs   = newLogs.filter(l => !existingIds.has(l.id))
if (addedLogs.length > 0) {
  // Add just 1 new log per cycle
  allLogsRef.current = [...allLogsRef.current, addedLogs[0]].slice(-500)
}

      // ── Sound: play only ONCE per alert, max 3 beeps for CRITICAL ──
      if (soundEnabled) {
        for (const alert of newAlerts) {
          if (!soundedIds.current.has(alert.id)) {
            soundedIds.current.add(alert.id)
            if (alert.severity === 'CRITICAL') {
              // 3 beeps for critical
              playSound('critical')
              setTimeout(() => playSound('critical'), 600)
              setTimeout(() => playSound('critical'), 1200)
            } else if (alert.severity === 'HIGH') {
              // 1 beep for high
              playSound('high')
            }
          }
        }
      }

      // ── Build time series ───────────────────────────────────────────
      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      const newPoint: TimePoint = {
        time:     timeLabel,
        total:    allLogsRef.current.length,
        critical: newLogs.filter(l => l.severity === 'CRITICAL').length,
        high:     newLogs.filter(l => l.severity === 'HIGH').length,
        medium:   newLogs.filter(l => l.severity === 'MEDIUM').length,
        low:      newLogs.filter(l => l.severity === 'LOW').length,
      }
      timeSeriesRef.current = [...timeSeriesRef.current, newPoint].slice(-20)

      const criticalCount = newAlerts.filter(a => a.severity === 'CRITICAL').length
      const highCount     = newAlerts.filter(a => a.severity === 'HIGH').length
      const mediumCount   = newAlerts.filter(a => a.severity === 'MEDIUM').length
      const lowCount      = newAlerts.filter(a => a.severity === 'LOW').length

      setLogs(allLogsRef.current)
      setAlerts(newAlerts)
      setMetrics({
        totalLogs:         allLogsRef.current.length,
        totalAlerts:       newAlerts.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        mlActive:          false,
        resolvedIncidents: 0,
        timeSeriesData:    [...timeSeriesRef.current],
      })
      setError(null)
    } catch {
      setError(`Cannot reach backend at ${API}`)
    } finally {
      setLoading(false)
    }
  }, [soundEnabled, playSound])

  useEffect(() => {
    fetchAll()
    const timer = setInterval(fetchAll, 2_000)
    return () => clearInterval(timer)
  }, [fetchAll])

  return { logs, alerts, metrics, loading, error, refetch: fetchAll }
}