// src/components/Dashboard.tsx
import { AlertTriangle, Database, Shield, Clock, Brain, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts'
import type { LogEntry, Alert, SecurityMetrics } from '../types'
import AttackHeatmap  from './AttackHeatmap'
import AnomalyDetection from './AnomalyDetection'
import ExportReports  from './ExportReports'

interface Props {
  logs:    LogEntry[]
  alerts:  Alert[]
  metrics: SecurityMetrics | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400',   critical: 'text-red-400',
  HIGH:     'text-orange-400', high:    'text-orange-400',
  MEDIUM:   'text-yellow-400', medium:  'text-yellow-400',
  LOW:      'text-green-400',  low:     'text-green-400',
  INFO:     'text-blue-400',
}

const SEV_BG: Record<string, string> = {
  CRITICAL: 'bg-red-900/30 border-red-800',   critical: 'bg-red-900/30 border-red-800',
  HIGH:     'bg-orange-900/30 border-orange-800', high: 'bg-orange-900/30 border-orange-800',
  MEDIUM:   'bg-yellow-900/30 border-yellow-800', medium: 'bg-yellow-900/30 border-yellow-800',
  LOW:      'bg-green-900/30 border-green-800',   low:  'bg-green-900/30 border-green-800',
  INFO:     'bg-blue-900/30 border-blue-800',
}

const PIE_COLORS = ['#dc2626','#ea580c','#ca8a04','#16a34a','#2563eb']

function StatCard({
  label, value, sub, icon, color
}: {
  label: string; value: number | string; sub?: string
  icon: React.ReactNode; color: string
}) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-4 ${color}`}>
      <div className="opacity-80 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs opacity-70 mt-0.5 leading-tight">{label}</p>
        {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Dashboard({ logs, alerts, metrics }: Props) {
  // Support both old (lowercase) and new (uppercase) severity formats
  const criticalAlerts = alerts.filter(
    a => a.severity === 'critical' || a.severity === 'CRITICAL'
  ).length
  const highAlerts = alerts.filter(
    a => a.severity === 'high' || a.severity === 'HIGH'
  ).length
  const openAlerts = alerts.filter(
    a => (a as any).isThreat || a.status === 'open'
  ).length

  const recentLogs = logs.slice(0, 8)

  // Build pie data from alerts by severity
  const sevCounts = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map((s, i) => ({
    name:  s,
    value: alerts.filter(a =>
      a.severity?.toUpperCase() === s || a.severity === s.toLowerCase()
    ).length,
    color: PIE_COLORS[i],
  })).filter(d => d.value > 0)

  // Build category bar data from logs
  const catCounts: Record<string, number> = {}
  logs.forEach(l => {
    const cat = (l as any).category ?? l.type ?? 'unknown'
    catCounts[cat] = (catCounts[cat] ?? 0) + 1
  })
  const catData = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  return (
    <div className="space-y-5">

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Logs"
          value={metrics?.totalLogs ?? logs.length}
          icon={<Database size={26} />}
          color="bg-blue-900/30 border-blue-800 text-blue-300"
        />
        <StatCard
          label="Active Alerts"
          value={openAlerts}
          sub={`${criticalAlerts} critical`}
          icon={<AlertTriangle size={26} />}
          color="bg-orange-900/30 border-orange-800 text-orange-300"
        />
        <StatCard
          label="Critical Threats"
          value={criticalAlerts}
          sub={`${highAlerts} high severity`}
          icon={<Shield size={26} />}
          color="bg-red-900/30 border-red-800 text-red-300"
        />
        <StatCard
          label="Resolved"
          value={metrics?.resolvedIncidents ?? 0}
          icon={<Clock size={26} />}
          color="bg-green-900/30 border-green-800 text-green-300"
        />
      </div>

      {/* ── Export bar ────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <TrendingUp size={15} className="text-blue-400" />
          <span>Export your log data for reporting</span>
        </div>
        <ExportReports logs={logs as any} />
      </div>

      {/* ── Charts row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Log activity over time */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Log Activity Over Time</h2>
          {metrics?.timeSeriesData && metrics.timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={metrics.timeSeriesData}>
                <defs>
                  <linearGradient id="logGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="logs" stroke="#3b82f6" fill="url(#logGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : catData.length > 0 ? (
            // Fallback: show category distribution if no time series
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData}>
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">Waiting for data…</div>
          )}
        </div>

        {/* Severity pie chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Alert Severity Breakdown</h2>
          {sevCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={sevCounts} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={65} innerRadius={35}
                >
                  {sevCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">
              No alert data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Top threat categories bar ──────────────────────────────────── */}
      {catData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Top Event Categories</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={catData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Attack Heatmap ────────────────────────────────────────────── */}
      <AttackHeatmap />

      {/* ── ML Anomaly Detection ──────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-300">ML Anomaly Detection Preview</h2>
          <span className="text-xs text-gray-500">(Full view in ML Anomalies tab)</span>
        </div>
        <AnomalyDetection compact />
      </div>

      {/* ── Recent logs ───────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Log Entries</h2>
        {recentLogs.length === 0 ? (
          <p className="text-gray-600 text-sm">Waiting for live logs…</p>
        ) : (
          <div className="space-y-1.5">
            {recentLogs.map(log => {
              const sev = (log.severity ?? '').toUpperCase()
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs ${SEV_BG[sev] ?? SEV_BG[log.severity] ?? 'bg-gray-800 border-gray-700'}`}
                >
                  <span className={`font-bold uppercase w-16 shrink-0 mt-0.5 ${SEV_COLOR[sev] ?? SEV_COLOR[log.severity]}`}>
                    {sev || log.severity}
                  </span>
                  <span className="text-gray-500 shrink-0">
                    {(log as any).hostname ?? (log as any).source ?? '—'}
                  </span>
                  <span className="text-gray-300 truncate flex-1">{log.message}</span>
                  <span className="text-gray-600 shrink-0 ml-auto">
                    {(log as any).timestamp ?? (log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '—')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Recent alerts ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-gray-600 text-sm">No alerts yet — system is monitoring…</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map(alert => {
              const sev = (alert.severity ?? '').toUpperCase()
              return (
                <div key={alert.id} className={`rounded-lg border px-4 py-3 ${SEV_BG[sev] ?? SEV_BG[alert.severity] ?? 'bg-gray-800 border-gray-700'}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${SEV_COLOR[sev] ?? SEV_COLOR[alert.severity]}`}>
                      {(alert as any).title ?? alert.message}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sev === 'CRITICAL' ? 'bg-red-900 text-red-300' :
                      sev === 'HIGH'     ? 'bg-orange-900 text-orange-300' :
                      sev === 'MEDIUM'   ? 'bg-yellow-900 text-yellow-300' :
                                           'bg-green-900 text-green-300'
                    }`}>
                      {sev || alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {(alert as any).description ?? alert.message}
                  </p>
                  {(alert as any).sourceIp && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Source IP: <span className="text-blue-400 font-mono">{(alert as any).sourceIp}</span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
