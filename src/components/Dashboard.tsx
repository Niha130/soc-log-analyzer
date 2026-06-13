// src/components/Dashboard.tsx
import { AlertTriangle, Database, Shield, Clock, Brain, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import AttackHeatmap    from './AttackHeatmap'
import AnomalyDetection from './AnomalyDetection'
import ExportReports    from './ExportReports'
import type { LogEntry, AlertEntry, Metrics } from '../hooks/useLiveLogs'

interface Props {
  logs:    LogEntry[]
  alerts:  AlertEntry[]
  metrics: Metrics | null
  loading: boolean
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-green-400',
  INFO:     'text-blue-400',
}

const SEV_BG: Record<string, string> = {
  CRITICAL: 'bg-red-900/30 border-red-800',
  HIGH:     'bg-orange-900/30 border-orange-800',
  MEDIUM:   'bg-yellow-900/30 border-yellow-800',
  LOW:      'bg-green-900/30 border-green-800',
  INFO:     'bg-blue-900/30 border-blue-800',
}

const PIE_COLORS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb']

function StatCard({ label, value, sub, icon, color }: {
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

export default function Dashboard({ logs, alerts, metrics, loading }: Props) {
  const criticalCount = metrics?.criticalCount ?? alerts.filter(a => a.severity === 'CRITICAL').length
  const highCount     = metrics?.highCount     ?? alerts.filter(a => a.severity === 'HIGH').length
  const totalAlerts   = metrics?.totalAlerts   ?? alerts.length
  const recentLogs    = logs.slice(0, 10)
  const timeData      = metrics?.timeSeriesData ?? []

  const sevCounts = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'].map((s, i) => ({
    name:  s,
    value: alerts.filter(a => a.severity === s).length,
    color: PIE_COLORS[i],
  })).filter(d => d.value > 0)

  const catCounts: Record<string, number> = {}
  logs.forEach(l => {
    const cat = l.category ?? 'UNKNOWN'
    catCounts[cat] = (catCounts[cat] ?? 0) + 1
  })
  const catData = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  return (
    <div className="p-4 space-y-5">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Logs"
          value={metrics?.totalLogs ?? logs.length}
          icon={<Database size={26} />}
          color="bg-blue-900/30 border-blue-800 text-blue-300"
        />
        <StatCard
          label="Active Alerts"
          value={totalAlerts}
          sub={`${criticalCount} critical`}
          icon={<AlertTriangle size={26} />}
          color="bg-orange-900/30 border-orange-800 text-orange-300"
        />
        <StatCard
          label="Critical Threats"
          value={criticalCount}
          sub={`${highCount} high severity`}
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

      {/* ── Export bar ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <TrendingUp size={15} className="text-blue-400" />
          <span>Export your log data for reporting</span>
        </div>
        <ExportReports logs={logs} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Log Activity */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Log Activity Over Time</h2>
          {loading && timeData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm animate-pulse">
              Fetching data…
            </div>
          ) : timeData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="logsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="threatsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="logs"    stroke="#3b82f6" fill="url(#logsGrad)"    strokeWidth={2} name="Logs" />
                <Area type="monotone" dataKey="threats" stroke="#ef4444" fill="url(#threatsGrad)" strokeWidth={2} name="Threats" />
              </AreaChart>
            </ResponsiveContainer>
          ) : catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catData}>
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">
              Chart builds after first fetch…
            </div>
          )}
        </div>

        {/* Severity Pie */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Severity Breakdown</h2>
          {sevCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sevCounts} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {sevCounts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-600 text-sm">
              {loading ? 'Loading…' : 'No alert data yet'}
            </div>
          )}
        </div>
      </div>

      {/* ── Top categories ── */}
      {catData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Top Event Categories</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={catData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#f97316" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Live log feed ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-300">Live Log Feed</h2>
          </div>
          <span className="text-xs text-gray-600 font-mono">
            {logs.length} entries · 1 new/sec
          </span>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm animate-pulse">
            Connecting to log stream…
          </div>
        ) : recentLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-600 text-sm">
            Waiting for logs…
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {recentLogs.map((log, idx) => (
              <div
                key={log.id}
                className={`flex items-center gap-3 px-4 py-2 text-xs font-mono transition-all ${
                  idx === 0 ? 'bg-blue-900/10' : ''
                }`}
              >
                {/* Severity dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  log.severity === 'CRITICAL' ? 'bg-red-500'    :
                  log.severity === 'HIGH'     ? 'bg-orange-500' :
                  log.severity === 'MEDIUM'   ? 'bg-yellow-500' :
                  log.severity === 'LOW'      ? 'bg-green-500'  : 'bg-blue-500'
                }`} />

                {/* Time */}
                <span className="text-gray-600 shrink-0 w-20">
                  {log.timestamp?.slice(11, 19) ?? '—'}
                </span>

                {/* Severity label */}
                <span className={`shrink-0 w-16 font-bold uppercase ${SEV_COLOR[log.severity] ?? 'text-gray-400'}`}>
                  {log.severity}
                </span>

                {/* Hostname */}
                <span className="text-blue-400 shrink-0 w-28 truncate">
                  {log.hostname}
                </span>

                {/* Source IP */}
                <span className="text-gray-500 shrink-0 w-28">
                  {log.sourceIp}
                </span>

                {/* Message */}
                <span className="text-gray-300 truncate flex-1">
                  {log.message}
                </span>

                {/* MITRE tag */}
                {log.mitre && (
                  <span className="text-purple-400 shrink-0">{log.mitre}</span>
                )}

                {/* ML anomaly */}
                {log.ml?.isAnomaly && (
                  <span className="text-purple-300 shrink-0">🧠</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Alerts ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent Alerts</h2>
        {loading && alerts.length === 0 ? (
          <p className="text-gray-600 text-sm animate-pulse">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-gray-600 text-sm">No alerts yet — system is monitoring…</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id}
                className={`rounded-lg border px-4 py-3 ${SEV_BG[alert.severity] ?? 'bg-gray-800 border-gray-700'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${SEV_COLOR[alert.severity] ?? 'text-gray-300'}`}>
                    {alert.message}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                    alert.severity === 'CRITICAL' ? 'bg-red-900 text-red-300 border-red-700'       :
                    alert.severity === 'HIGH'     ? 'bg-orange-900 text-orange-300 border-orange-700' :
                    alert.severity === 'MEDIUM'   ? 'bg-yellow-900 text-yellow-300 border-yellow-700' :
                                                    'bg-green-900 text-green-300 border-green-700'
                  }`}>{alert.severity}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  <span className="text-blue-400">{alert.sourceIp}</span>
                  {' → '}{alert.hostname}
                  {alert.mitre && <span className="ml-2 text-purple-400">· {alert.mitre}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Attack Heatmap ── */}
      <AttackHeatmap />

      {/* ── ML Anomaly Preview ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-300">ML Anomaly Detection Preview</h2>
          <span className="text-xs text-gray-500">(Full view → ML Anomalies tab)</span>
        </div>
        <AnomalyDetection />
      </div>

    </div>
  )
}