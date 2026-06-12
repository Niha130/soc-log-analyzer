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
  anomaly?:  boolean
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

  const prevAlertIds  = useRef<Set<string>>(new Set())
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

      // Sound alerts for NEW threats
      if (soundEnabled && prevAlertIds.current.size > 0) {
        for (const alert of newAlerts) {
          if (!prevAlertIds.current.has(alert.id)) {
            if (alert.severity === 'CRITICAL') playSound('critical')
            else if (alert.severity === 'HIGH') playSound('high')
          }
        }
      }
      prevAlertIds.current = new Set(newAlerts.map((a: AlertEntry) => a.id))

      // Build time series — keeps last 20 points
      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      const newPoint: TimePoint = {
        time:    timeLabel,
        logs:    newLogs.length,
        threats: newAlerts.length,
      }
      const updated = [...timeSeriesRef.current, newPoint].slice(-20)
      timeSeriesRef.current = updated

      const criticalCount = newAlerts.filter(a => a.severity === 'CRITICAL').length
      const highCount     = newAlerts.filter(a => a.severity === 'HIGH').length
      const mediumCount   = newAlerts.filter(a => a.severity === 'MEDIUM').length
      const lowCount      = newAlerts.filter(a => a.severity === 'LOW').length

      setLogs(newLogs)
      setAlerts(newAlerts)
      setMetrics({
        totalLogs:         newLogs.length,
        totalAlerts:       newAlerts.length,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        mlActive:          newLogs.some(l => l.ml?.mlStatus === 'active'),
        resolvedIncidents: 0,
        timeSeriesData:    [...updated],
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
    const timer = setInterval(fetchAll, 10_000)
    return () => clearInterval(timer)
  }, [fetchAll])

  return { logs, alerts, metrics, loading, error, refetch: fetchAll }
}