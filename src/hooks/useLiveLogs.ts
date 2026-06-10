import { useState, useEffect, useCallback } from 'react';
import type { LogEntry } from '../index';

export const useLiveLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [newLogCount, setNewLogCount] = useState(0);
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    openAlerts: 0,
    resolved: 0,
  });

  const updateAlertStatus = useCallback((id: string, status: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }, []);

  const toggleLive = useCallback(() => setIsLive(prev => !prev), []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/logs');
      const data = await res.json();
      const newLogs: LogEntry[] = data.logs || [];

      setLogs(newLogs);
      setNewLogCount(newLogs.length);

 const critical = newLogs.filter(l => l.severity === 'CRITICAL').length;
const high = newLogs.filter(l => l.severity === 'HIGH').length;
const medium = newLogs.filter(l => l.severity === 'MEDIUM').length;
const low = newLogs.filter(l => l.severity === 'LOW').length;

const newAlerts = newLogs
  .filter(l => l.severity === 'CRITICAL' || l.severity === 'HIGH')
        .map(l => ({ ...l, status: 'open' }));

      setAlerts(newAlerts);
      setStats({
        total: newLogs.length,
        critical,
        high,
        medium,
        low,
        openAlerts: newAlerts.length,
        resolved: 0,
      });

      setTimeSeries(prev => {
        const point = {
          time: new Date().toLocaleTimeString(),
          critical,
          high,
          medium,
          low,
        };
        const updated = [...prev, point];
        return updated.slice(-20);
      });
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    if (!isLive) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs, isLive]);

  return { logs, alerts, isLive, toggleLive, newLogCount, timeSeries, stats, updateAlertStatus };
};