// src/hooks/useLiveLogs.ts
// Fetches live logs + alerts from backend, triggers sound on new threats

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

export interface Metrics {
  totalLogs:     number
  totalAlerts:   number
  criticalCount: number
  highCount:     number
  mlActive:      boolean
}

export function useLiveLogs(soundEnabled: boolean = true) {
  const [logs,    setLogs]    = useState<LogEntry[]>([])
  const [alerts,  setAlerts]  = useState<AlertEntry[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const prevAlertIds = useRef<Set<string>>(new Set())
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

      const newLogs   = logsJson.logs   || []
      const newAlerts = alertsJson.alerts || []

      // ── Sound notification for NEW alerts ─────────────────────────────────
      if (soundEnabled && prevAlertIds.current.size > 0) {
        for (const alert of newAlerts) {
          if (!prevAlertIds.current.has(alert.id)) {
            if (alert.severity === 'CRITICAL') playSound('critical')
            else if (alert.severity === 'HIGH') playSound('high')
          }
        }
      }
      prevAlertIds.current = new Set(newAlerts.map((a: AlertEntry) => a.id))

      setLogs(newLogs)
      setAlerts(newAlerts)
      setMetrics({
        totalLogs:     newLogs.length,
        totalAlerts:   newAlerts.length,
        criticalCount: newAlerts.filter((a: AlertEntry) => a.severity === 'CRITICAL').length,
        highCount:     newAlerts.filter((a: AlertEntry) => a.severity === 'HIGH').length,
        mlActive:      newLogs.some((l: LogEntry) => l.ml?.mlStatus === 'active'),
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
    const timer = setInterval(fetchAll, 15_000)   // refresh every 15s
    return () => clearInterval(timer)
  }, [fetchAll])

  return { logs, alerts, metrics, loading, error, refetch: fetchAll }
}
