// src/components/LogAnalyzer.tsx
import { useState, useMemo } from 'react'
import { Search, Filter, Brain, Download } from 'lucide-react'
import type { LogEntry } from '../hooks/useLiveLogs'
import ExportReports from './ExportReports'

const SEV_BADGE: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-900/20 border-red-800',
  HIGH:     'text-orange-400 bg-orange-900/20 border-orange-800',
  MEDIUM:   'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  LOW:      'text-green-400 bg-green-900/20 border-green-800',
  INFO:     'text-blue-400 bg-blue-900/20 border-blue-800',
}

const SEV_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-500',
  LOW:      'bg-green-500',
  INFO:     'bg-blue-500',
}

const ALL_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

interface Props {
  logs:   LogEntry[]
  isLive: boolean
}

export default function LogAnalyzer({ logs, isLive }: Props) {
  const [search,   setSearch]   = useState('')
  const [severity, setSeverity] = useState('all')
  const [category, setCategory] = useState('all')
  const [onlyML,   setOnlyML]   = useState(false)

  // Collect unique categories from actual live data
  const categories = useMemo(() => {
    const cats = new Set<string>()
    logs.forEach(l => { if (l.category) cats.add(l.category) })
    return Array.from(cats).sort()
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (severity !== 'all' && l.severity !== severity) return false
      if (category !== 'all' && l.category !== category) return false
      if (onlyML && !l.ml?.isAnomaly) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          l.message?.toLowerCase().includes(q)  ||
          l.sourceIp?.includes(q)               ||
          l.hostname?.toLowerCase().includes(q) ||
          l.user?.toLowerCase().includes(q)     ||
          l.category?.toLowerCase().includes(q) ||
          l.mitre?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [logs, search, severity, category, onlyML])

  const anomalyCount = logs.filter(l => l.ml?.isAnomaly).length

  // Count per severity for the filter bar badges
  const sevCounts = useMemo(() => {
    const c: Record<string, number> = {}
    logs.forEach(l => { c[l.severity] = (c[l.severity] ?? 0) + 1 })
    return c
  }, [logs])

  return (
    <div className="p-4 space-y-4">

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-gray-500 font-mono">
            {isLive ? 'Live feed active — 1 new log/sec' : 'Backend offline'}
          </span>
        </div>
        <span className="text-gray-600 font-mono">
          {filtered.length} / {logs.length} entries
        </span>
      </div>

      {/* ── Severity quick filters ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSeverity('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            severity === 'all'
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          All ({logs.length})
        </button>
        {ALL_SEVERITIES.map(s => (
          <button
            key={s}
            onClick={() => setSeverity(severity === s ? 'all' : s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              severity === s
                ? 'bg-gray-700 border-gray-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${SEV_DOT[s]}`} />
            {s} ({sevCounts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* ── Search + filters bar ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-wrap gap-3 items-center">

        {/* Search input */}
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex-1 min-w-52">
          <Search size={13} className="text-gray-500 shrink-0" />
          <input
            className="bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none w-full font-mono"
            placeholder="Search message, IP, host, user, MITRE…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-600 hover:text-gray-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-500" />
          <select
            className="bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded-lg px-3 py-2 outline-none font-mono"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ML anomaly toggle */}
        <button
          onClick={() => setOnlyML(p => !p)}
          className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors font-mono ${
            onlyML
              ? 'bg-purple-900/50 border-purple-700 text-purple-300'
              : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
          }`}
        >
          <Brain size={12} />
          ML Anomalies Only
          {anomalyCount > 0 && (
            <span className="bg-purple-700 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
              {anomalyCount}
            </span>
          )}
        </button>

        {/* Export */}
        <div className="ml-auto">
          <ExportReports logs={logs} />
        </div>
      </div>

      {/* ── Live log table ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* Table header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-gray-800/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-400 font-mono">Live Log Stream</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
            <Download size={10} />
            Use export buttons above to download
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/40 text-gray-500">
                <th className="text-left px-4 py-2.5 font-medium w-5"></th>
                <th className="text-left px-4 py-2.5 font-medium w-24">Time</th>
                <th className="text-left px-4 py-2.5 font-medium w-24">Severity</th>
                <th className="text-left px-4 py-2.5 font-medium w-24">Category</th>
                <th className="text-left px-4 py-2.5 font-medium w-32">Source IP</th>
                <th className="text-left px-4 py-2.5 font-medium w-28">Hostname</th>
                <th className="text-left px-4 py-2.5 font-medium w-20">User</th>
                <th className="text-left px-4 py-2.5 font-medium w-16">MITRE</th>
                <th className="text-left px-4 py-2.5 font-medium w-14">ML</th>
                <th className="text-left px-4 py-2.5 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-600">
                    {logs.length === 0
                      ? '⏳ Connecting to live log stream…'
                      : '🔍 No logs match your current filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((log, idx) => (
                  <tr
                    key={log.id}
                    className={`border-b border-gray-800/40 transition-colors ${
                      idx === 0 && !search && severity === 'all'
                        ? 'bg-blue-900/10'
                        : log.ml?.isAnomaly
                        ? 'bg-purple-900/10 hover:bg-purple-900/20'
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    {/* Severity dot */}
                    <td className="px-3 py-2.5">
                      <span className={`w-2 h-2 rounded-full block ${SEV_DOT[log.severity] ?? 'bg-gray-500'}`} />
                    </td>

                    {/* Time */}
                    <td className="px-2 py-2.5 text-gray-600 whitespace-nowrap">
                      {log.timestamp?.slice(11, 19) ?? '—'}
                    </td>

                    {/* Severity badge */}
                    <td className="px-2 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border font-bold text-[10px] uppercase ${
                        SEV_BADGE[log.severity] ?? 'text-gray-400 border-gray-700'
                      }`}>
                        {log.severity}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-2 py-2.5 text-gray-400">
                      {log.category ?? '—'}
                    </td>

                    {/* Source IP */}
                    <td className="px-2 py-2.5 text-blue-400">
                      {log.sourceIp ?? '—'}
                    </td>

                    {/* Hostname */}
                    <td className="px-2 py-2.5 text-gray-400">
                      {log.hostname ?? '—'}
                    </td>

                    {/* User */}
                    <td className="px-2 py-2.5 text-gray-500">
                      {log.user ?? '—'}
                    </td>

                    {/* MITRE */}
                    <td className="px-2 py-2.5">
                      {log.mitre
                        ? <span className="text-purple-400">{log.mitre}</span>
                        : <span className="text-gray-700">—</span>
                      }
                    </td>

                    {/* ML Score */}
                    <td className="px-2 py-2.5">
                      {log.ml ? (
                        <div className="flex items-center gap-1">
                          {log.ml.isAnomaly && (
                            <Brain size={10} className="text-purple-400 shrink-0" />
                          )}
                          <div className="w-8 bg-gray-700 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full ${
                                log.ml.isAnomaly ? 'bg-purple-500' : 'bg-gray-500'
                              }`}
                              style={{ width: `${log.ml.anomalyScore}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>

                    {/* Message */}
                    <td className="px-2 py-2.5 text-gray-300 max-w-xs">
                      <span className="truncate block">{log.message}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {filtered.length > 0 && (
          <div className="border-t border-gray-800 px-4 py-2 text-[10px] text-gray-600 font-mono flex justify-between items-center">
            <span>
              Showing <span className="text-gray-400">{filtered.length}</span> of{' '}
              <span className="text-gray-400">{logs.length}</span> total logs
              {anomalyCount > 0 && (
                <span className="ml-3 text-purple-500">
                  · {anomalyCount} ML anomalies detected
                </span>
              )}
            </span>
            <span className="text-gray-700">
              New entries appear at top · 1 per second
            </span>
          </div>
        )}
      </div>
    </div>
  )
}