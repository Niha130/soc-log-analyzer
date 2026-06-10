import { useState, useEffect, useRef, useCallback } from 'react';
import type { LogEntry, Alert, TimeSeriesPoint } from '../types';
import { generateLogEntry, generateAlerts, generateInitialLogs } from '../utils/mockData';

let logCounter = 1000;

export function useLiveLogs() {
  const [logs, setLogs] = useState<LogEntry[]>(() => generateInitialLogs(80));
  const [alerts, setAlerts] = useState<Alert[]>(() => generateAlerts());
  const [isLive, setIsLive] = useState(true);
  const [newLogCount, setNewLogCount] = useState(0);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const mins = 20 - i;
      const d = new Date(Date.now() - mins * 60000);
      return {
        time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        critical: Math.floor(Math.random() * 5),
        high: Math.floor(Math.random() * 12),
        medium: Math.floor(Math.random() * 20),
        low: Math.floor(Math.random() * 30),
        total: 0,
      };
    }).map(p => ({ ...p, total: p.critical + p.high + p.medium + p.low }));
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback(() => {
    const entry = generateLogEntry(++logCounter);
    setLogs(prev => [entry, ...prev].slice(0, 500));
    setNewLogCount(c => c + 1);

    if (entry.severity === 'CRITICAL' || (entry.severity === 'HIGH' && Math.random() > 0.6)) {
      const alert: Alert = {
        id: `ALT-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        title: `Auto-Detected: ${entry.category} on ${entry.hostname}`,
        description: entry.message,
        severity: entry.severity,
        category: entry.category,
        status: 'OPEN',
        affectedHost: entry.hostname,
        sourceIp: entry.sourceIp,
        timestamp: entry.timestamp,
        updatedAt: entry.timestamp,
        relatedLogs: [entry.id],
      };
      setAlerts(prev => [alert, ...prev].slice(0, 100));
    }

    setTimeSeries(prev => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const last = prev[prev.length - 1];

      if (last && last.time === timeStr) {
        const updated = [...prev];
        const point = { ...updated[updated.length - 1] };
        if (entry.severity === 'CRITICAL') point.critical++;
        else if (entry.severity === 'HIGH') point.high++;
        else if (entry.severity === 'MEDIUM') point.medium++;
        else point.low++;
        point.total = point.critical + point.high + point.medium + point.low;
        updated[updated.length - 1] = point;
        return updated;
      } else {
        const newPoint: TimeSeriesPoint = {
          time: timeStr,
          critical: entry.severity === 'CRITICAL' ? 1 : 0,
          high: entry.severity === 'HIGH' ? 1 : 0,
          medium: entry.severity === 'MEDIUM' ? 1 : 0,
          low: entry.severity === 'LOW' || entry.severity === 'INFO' ? 1 : 0,
          total: 1,
        };
        return [...prev.slice(-19), newPoint];
      }
    });
  }, []);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(() => {
        const count = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < count; i++) addLog();
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, addLog]);

  const toggleLive = useCallback(() => {
    setIsLive(v => !v);
    setNewLogCount(0);
  }, []);

  const updateAlertStatus = useCallback((id: string, status: Alert['status']) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a));
  }, []);

  const stats = {
    total: logs.length,
    critical: logs.filter(l => l.severity === 'CRITICAL').length,
    high: logs.filter(l => l.severity === 'HIGH').length,
    medium: logs.filter(l => l.severity === 'MEDIUM').length,
    low: logs.filter(l => l.severity === 'LOW').length,
    openAlerts: alerts.filter(a => a.status === 'OPEN').length,
    resolvedToday: alerts.filter(a => a.status === 'RESOLVED').length,
    falsePositives: alerts.filter(a => a.status === 'FALSE_POSITIVE').length,
  };

  return { logs, alerts, isLive, toggleLive, newLogCount, timeSeries, stats, updateAlertStatus };
}
