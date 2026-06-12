// src/components/LogAnalyzer.tsx
import { useState, useMemo } from 'react'
import { Search, Filter, Brain } from 'lucide-react'
import type { LogEntry } from '../types'
import ExportReports from './ExportReports'

// Support both old (lowercase) and new (uppercase) severity/category
type AnyLog = LogEntry & {
  hostname?:    string
  sourceIp?:    string
  category?:    string
  isThreat?:    boolean
  country?:     string
  protocol?:    string
  bytes?:       number
  mitre?:       string
  ml?: {
    isAnomaly:    boolean
    anomalyScore: number
    mlStatus:     string
  }
}

const SEV_BADGE: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-900/20 border-red-800',
  HIGH:     'text-orange-400 bg-orange-900/20 border-orange-800',
  MEDIUM:   'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  LOW:      'text-green-400 bg-green-900/20 border-green-800',
  INFO:     'text-blue-400 bg-blue-900/20 border-blue-800',
  critical: 'text-red-400 bg-red-900/20 border-red-800',
  high:     'text-orange-400 bg-orange-900/20 border-orange-800',
  medium:   'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  low:      'text-green-400 bg-green-900/20 border-green-800',
}

const ALL_SEVERITIES = ['CRITICAL','HIGH','MEDIUM','LOW','INFO']

export default function LogAnalyzer({ logs }: { logs: LogEntry[] }) {
  const [search,   setSearch]   = useState('')
  const [severity, setSeverity] = useState('all')
  const [onlyML,   setOnlyML]   = useState(false)

  const anyLogs = logs as AnyLog[]

  // Collect unique categories from actual data
  const categories = useMemo(() => {
    const cats = new Set<string>()
    anyLogs.forEach(l => {
      if (l.category) cats.add(l.category)
      if (l.type)     cats.add(l.type)
    })
    return Array.from(cats).sort()
  }, [anyLogs])

  const [category, setCategory] = useState('all')

  const filtered = useMemo(() => {
    return anyLogs.filter(l => {
      const sev = l.severity?.toUpperCase()
      const cat = l.category ?? l.type ?? ''

      if (severity !== 'all' && sev !== severity) return false
      if (category !== 'all' && cat !== category && l.type !== category) return false
      if (onlyML && !l.ml?.isAnomaly) return false

      if (search) {
        const q = search.toLowerCase()
        const inMsg  = l.message?.toLowerCase().includes(q)
        const inSrc  = l.source?.toLowerCase().includes(q)
        const inIP   = (l.sourceIp ?? l.sourceIP ?? '').includes(q)
        const inHost = (l.hostname ?? '').toLowerCase().includes(q)
        const inUser = (l.user ?? '').toLowerCase().includes(q)
        if (!inMsg && !inSrc && !inIP && !inHost && !inUser) return false
      }
      return true
    })
  }, [anyLogs, search, severity, category, onlyML])

  const anomalyCount = anyLogs.filter(l => l.ml?.isAnomaly).length

  return (
    <div className="space-y-4">

      {/* ── Filters bar ─────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">

        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-500 shrink-0" />
          <input
            className="bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none w-full"
            placeholder="Search message, IP, hostname, user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          <select
            className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg px-3 py-2 outline-none"
            value={severity}
            onChange={e => setSeverity(e.target.value)}
          >
            <option value="all">All Severities</option>
            {ALL_SEVERITIES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <select
          className="bg-gray-800 border border-gray-700 text-sm text-gray-300 rounded-lg px-3 py-2 outline-none"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* ML Anomaly filter toggle */}
        <button
          onClick={() => setOnlyML(p => !p)}
          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors ${
            onlyML
              ? 'bg-purple-900/50 border-purple-700 text-purple-300'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Brain size={13} />
          ML Anomalies Only
          {anomalyCount > 0 && (
            <span className="bg-purple-700 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {anomalyCount}
            </span>
          )}
        </button>

        <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">
          {filtered.length} / {logs.length} entries
        </span>
      </div>

      {/* ── Export bar ──────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <ExportReports logs={anyLogs as any} />
      </div>

      {/* ── Log table ───────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium w-36">Time</th>
                <th className="text-left px-4 py-3 font-medium w-24">Severity</th>
                <th className="text-left px-4 py-3 font-medium w-28">Category</th>
                <th className="text-left px-4 py-3 font-medium w-32">Source IP</th>
                <th className="text-left px-4 py-3 font-medium w-28">Hostname</th>
                <th className="text-left px-4 py-3 font-medium w-20">User</th>
                <th className="text-left px-4 py-3 font-medium">Message</th>
                <th className="text-left px-4 py-3 font-medium w-20">MITRE</th>
                <th className="text-left px-4 py-3 font-medium w-20">ML Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-600">
                    {logs.length === 0
                      ? 'Waiting for live logs from the backend…'
                      : 'No logs match your current filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map(log => {
                  const sev = log.severity?.toUpperCase() ?? log.severity
                  const isAnomaly = log.ml?.isAnomaly ?? false
                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                        isAnomaly ? 'bg-purple-900/10' : ''
                      }`}
                    >
                      {/* Time */}
                      <td className="px-4 py-2.5 text-gray-500 font-mono">
                        {log.timestamp
                          ? (typeof log.timestamp === 'string' && log.timestamp.includes('T')
                              ? new Date(log.timestamp).toLocaleTimeString()
                              : String(log.timestamp).split(' ').slice(3, 4).join('') || log.timestamp)
                          : '—'}
                      </td>

                      {/* Severity badge */}
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase ${SEV_BADGE[sev] ?? SEV_BADGE[log.severity] ?? 'text-gray-400 border-gray-700'}`}>
                          {sev || log.severity}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2.5 text-gray-400 capitalize">
                        {log.category ?? log.type ?? '—'}
                      </td>

                      {/* Source IP */}
                      <td className="px-4 py-2.5 text-blue-400 font-mono">
                        {log.sourceIp ?? log.sourceIP ?? '—'}
                      </td>

                      {/* Hostname */}
                      <td className="px-4 py-2.5 text-gray-400 font-mono">
                        {log.hostname ?? log.source ?? '—'}
                      </td>

                      {/* User */}
                      <td className="px-4 py-2.5 text-gray-400">
                        {log.user ?? '—'}
                      </td>

                      {/* Message */}
                      <td className="px-4 py-2.5 text-gray-300 max-w-xs truncate">
                        {log.message}
                      </td>

                      {/* MITRE */}
                      <td className="px-4 py-2.5">
                        {log.mitre ? (
                          <span className="text-purple-400 font-mono">{log.mitre}</span>
                        ) : log.threat?.mitreId ? (
                          <span className="text-purple-400 font-mono">{log.threat.mitreId}</span>
                        ) : '—'}
                      </td>

                      {/* ML Score */}
                      <td className="px-4 py-2.5">
                        {log.ml ? (
                          <div className="flex items-center gap-1.5">
                            {isAnomaly && <Brain size={11} className="text-purple-400 shrink-0" />}
                            <div className="w-12 bg-gray-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${isAnomaly ? 'bg-purple-500' : 'bg-gray-500'}`}
                                style={{ width: `${log.ml.anomalyScore}%` }}
                              />
                            </div>
                            <span className={`text-xs ${isAnomaly ? 'text-purple-400' : 'text-gray-600'}`}>
                              {log.ml.anomalyScore}
                            </span>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
