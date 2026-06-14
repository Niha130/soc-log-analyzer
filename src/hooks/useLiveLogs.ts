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
  const [logs,    setLogs]    = useState<LogEntry[]>([])
  const [alerts,  setAlerts]  = useState<AlertEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const accumulatedLogs = useRef<LogEntry[]>([])
  const fetchIndexRef   = useRef(0)
  const soundedIds      = useRef<Set<string>>(new Set())
  const timeSeriesRef   = useRef<TimePoint[]>([])
  const { playSound }   = useSoundAlerts()

  const fetchAll = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const [logsRes, alertsRes] = await Promise.all([
        fetch(`${API}/api/logs`,   { signal: controller.signal }),
        fetch(`${API}/api/alerts`, { signal: controller.signal }),
      ])
      clearTimeout(timeout)

      if (!logsRes.ok || !alertsRes.ok) throw new Error('API error')

      const logsJson   = await logsRes.json()
      const alertsJson = await alertsRes.json()

      const newLogs:   LogEntry[]   = logsJson.logs    || []
      const newAlerts: AlertEntry[] = alertsJson.alerts || []

      // ── On first load add first 5 logs immediately ───────────────────
      if (accumulatedLogs.current.length === 0 && newLogs.length > 0) {
        const initial = newLogs.slice(0, 5).map((l, i) => ({
          ...l,
          id: `${l.id}-init-${i}`
        }))
        accumulatedLogs.current = initial
      } else if (newLogs.length > 0) {
        // Add 1 new log per fetch after initial load
        const idx  = fetchIndexRef.current % newLogs.length
        const pick = newLogs[idx]
        const uniqueLog = {
          ...pick,
          id: `${pick.id}-${Date.now()}`
        }
        accumulatedLogs.current = [uniqueLog, ...accumulatedLogs.current].slice(0, 500)
      }
      fetchIndexRef.current += 1

      // ── Sound: 2 beeps ONLY for CRITICAL ────────────────────────────
      if (soundEnabled) {
        for (const alert of newAlerts) {
          if (alert.severity === 'CRITICAL' && !soundedIds.current.has(alert.id)) {
            soundedIds.current.add(alert.id)
            playSound('critical')
            setTimeout(() => playSound('critical'), 700)
          }
        }
      }

      // ── Build time series ────────────────────────────────────────────
      const timeLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
      const newPoint: TimePoint = {
        time:     timeLabel,
        total:    accumulatedLogs.current.length,
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

      setLogs([...accumulatedLogs.current])
      setAlerts(newAlerts)
      setMetrics({
        totalLogs:         accumulatedLogs.current.length,
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
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(`Cannot reach backend at ${API}`)
      }
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