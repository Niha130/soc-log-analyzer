// src/hooks/useLiveLogs.ts
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSoundAlerts } from './useSoundAlerts'

const API = 'http://localhost:8002'
const STORAGE_KEY = 'soc_accumulated_logs'

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

// ── Load saved logs from localStorage on startup ─────────────────────────
function loadSavedLogs(): LogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function saveLogs(logs: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 500)))
  } catch {}
}

export function useLiveLogs(soundEnabled: boolean = true) {
  const [logs,    setLogs]    = useState<LogEntry[]>(() => loadSavedLogs())
  const [alerts,  setAlerts]  = useState<AlertEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const accumulatedLogs = useRef<LogEntry[]>(loadSavedLogs())
  const seenIds         = useRef<Set<string>>(new Set(loadSavedLogs().map(l => l.id)))
  const soundedIds      = useRef<Set<string>>(new Set())
  const timeSeriesRef   = useRef<TimePoint[]>([])
  const { playSound }   = useSoundAlerts()

  const fetchAll = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

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

      // ── Add only NEW logs we haven't seen before ─────────────────────
      let added = 0
      for (const log of newLogs) {
        if (!seenIds.current.has(log.id)) {
          seenIds.current.add(log.id)
          accumulatedLogs.current = [log, ...accumulatedLogs.current].slice(0, 500)
          added++
        }
      }

      // ── Save to localStorage so refresh doesn't lose data ────────────
      if (added > 0) {
        saveLogs(accumulatedLogs.current)
      }

      // ── Sound: 2 beeps ONLY for CRITICAL, once per alert ────────────
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
    const timer = setInterval(fetchAll, 1_000)
    return () => clearInterval(timer)
  }, [fetchAll])

  return { logs, alerts, metrics, loading, error, refetch: fetchAll }
}