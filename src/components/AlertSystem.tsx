// src/components/AlertSystem.tsx
import { useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'

interface AlertItem {
  id:         string
  timestamp?: string
  severity:   string
  category?:  string
  sourceIp?:  string
  destIp?:    string
  hostname?:  string
  user?:      string
  message:    string
  protocol?:  string
  port?:      number
  bytes?:     number
  country?:   string
  mitre?:     string
  isThreat?:  boolean
  ml?: {
    isAnomaly:    boolean
    anomalyScore: number
  }
}

interface Props {
  alerts:            AlertItem[]
  updateAlertStatus: (id: string, status: AlertStatus) => void
  onResolve?:        (id: string) => void
}

const SEV_BG: Record<string, string> = {
  CRITICAL: 'bg-red-900/20 border-red-800',
  HIGH:     'bg-orange-900/20 border-orange-800',
  MEDIUM:   'bg-yellow-900/20 border-yellow-800',
  LOW:      'bg-green-900/20 border-green-800',
  INFO:     'bg-blue-900/20 border-blue-800',
}

const SEV_TEXT: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-green-400',
  INFO:     'text-blue-400',
}

const STATUS_BG: Record<AlertStatus, string> = {
  OPEN:           'bg-red-900/50 text-red-300 border-red-700',
  INVESTIGATING:  'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  RESOLVED:       'bg-green-900/50 text-green-300 border-green-700',
  FALSE_POSITIVE: 'bg-gray-800 text-gray-500 border-gray-700',
}

const STATUSES: AlertStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']

const RECOMMENDATIONS: Record<string, string[]> = {
  MALWARE:    ['Isolate the affected host immediately', 'Run full AV scan', 'Capture memory image'],
  INTRUSION:  ['Block source IP in firewall', 'Enable MFA on all accounts', 'Review auth logs'],
  DATA_EXFIL: ['Block outbound connection', 'Audit data access logs', 'Notify security team'],
  AUTH:       ['Reset affected account password', 'Check for lateral movement', 'Review login history'],
  NETWORK:    ['Block scanning IP', 'Harden firewall rules', 'Monitor for follow-up attacks'],
  POLICY:     ['Warn the user', 'Review policy compliance', 'Check for repeated violations'],
  SYSTEM:     ['Check system integrity', 'Review recent changes', 'Verify backup status'],
}

export default function AlertSystem({ alerts, updateAlertStatus, onResolve }: Props) {
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [statuses,  setStatuses]  = useState<Record<string, AlertStatus>>({})
  const [filter,    setFilter]    = useState<string>('all')

  const getStatus = (id: string): AlertStatus => statuses[id] ?? 'OPEN'

  const handleStatus = (id: string, status: AlertStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }))
    updateAlertStatus(id, status)
    if (status === 'RESOLVED') onResolve?.(id)
  }

  const counts = {
    CRITICAL: alerts.filter(a => a.severity === 'CRITICAL').length,
    HIGH:     alerts.filter(a => a.severity === 'HIGH').length,
    MEDIUM:   alerts.filter(a => a.severity === 'MEDIUM').length,
    LOW:      alerts.filter(a => a.severity === 'LOW').length,
  }

  const filtered = alerts.filter(a =>
    filter === 'all' ? true : a.severity === filter
  )

  return (
    <div className="p-4 space-y-4">

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(sev => (
          <button
            key={sev}
            onClick={() => setFilter(filter === sev ? 'all' : sev)}
            className={`rounded-xl border p-3 text-left transition-all ${SEV_BG[sev]} ${
              filter === sev ? 'ring-2 ring-blue-500' : 'hover:opacity-80'
            }`}
          >
            <p className={`text-2xl font-bold ${SEV_TEXT[sev]}`}>{counts[sev]}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sev}</p>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all','CRITICAL','HIGH','MEDIUM','LOW'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            {f === 'all'
              ? `All (${alerts.length})`
              : `${f} (${counts[f as keyof typeof counts] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <AlertTriangle size={32} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {alerts.length === 0
              ? 'No alerts yet — system is monitoring your logs…'
              : 'No alerts match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const status   = getStatus(alert.id)
            const isOpen   = expanded === alert.id
            const recs     = RECOMMENDATIONS[alert.category ?? ''] ?? ['Investigate and respond appropriately']

            return (
              <div
                key={alert.id}
                className={`rounded-xl border overflow-hidden ${SEV_BG[alert.severity] ?? 'bg-gray-800 border-gray-700'}`}
              >
                {/* Header row */}
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : alert.id)}
                >
                  <AlertTriangle size={14} className={`shrink-0 ${SEV_TEXT[alert.severity] ?? 'text-gray-400'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${SEV_TEXT[alert.severity] ?? 'text-gray-300'}`}>
                        {alert.message}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_BG[status]}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">
                      {alert.sourceIp && <span className="text-blue-400">{alert.sourceIp}</span>}
                      {alert.hostname && <span> → {alert.hostname}</span>}
                      {alert.mitre    && <span className="ml-2 text-purple-400">· {alert.mitre}</span>}
                      {alert.country  && <span className="ml-2">· {alert.country}</span>}
                    </p>
                  </div>

                  {/* Status dropdown */}
                  <select
                    value={status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleStatus(alert.id, e.target.value as AlertStatus)}
                    className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded px-2 py-1 outline-none shrink-0"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>

                  {isOpen
                    ? <ChevronUp size={14} className="text-gray-500 shrink-0" />
                    : <ChevronDown size={14} className="text-gray-500 shrink-0" />
                  }
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-gray-700/50 px-4 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-gray-900/50">

                    {/* Details */}
                    <div className="space-y-1.5">
                      <p className="text-gray-500 font-semibold uppercase tracking-wide text-[10px] mb-2">Event Details</p>
                      {alert.category && <p className="text-gray-300">Category: <span className="text-orange-400">{alert.category}</span></p>}
                      {alert.sourceIp && <p className="text-gray-300">Source IP: <span className="text-blue-400 font-mono">{alert.sourceIp}</span></p>}
                      {alert.destIp   && <p className="text-gray-300">Destination: <span className="font-mono text-gray-400">{alert.destIp}</span></p>}
                      {alert.hostname && <p className="text-gray-300">Host: <span className="font-mono text-gray-400">{alert.hostname}</span></p>}
                      {alert.user     && <p className="text-gray-300">User: <span className="font-mono text-gray-400">{alert.user}</span></p>}
                      {alert.protocol && <p className="text-gray-300">Protocol: <span className="text-gray-400">{alert.protocol}</span></p>}
                      {alert.port     && <p className="text-gray-300">Port: <span className="font-mono text-gray-400">{alert.port}</span></p>}
                    </div>

                    {/* Threat info */}
                    <div className="space-y-1.5">
                      <p className="text-gray-500 font-semibold uppercase tracking-wide text-[10px] mb-2">Threat Info</p>
                      {alert.mitre   && <p className="text-gray-300">MITRE: <span className="text-purple-400 font-mono">{alert.mitre}</span></p>}
                      {alert.country && <p className="text-gray-300">Country: <span className="text-gray-400">{alert.country}</span></p>}
                      {alert.bytes   && <p className="text-gray-300">Bytes: <span className="font-mono text-gray-400">{alert.bytes.toLocaleString()}</span></p>}
                      {alert.timestamp && (
                        <p className="text-gray-300 flex items-center gap-1">
                          <Clock size={10} className="text-gray-500" />
                          {alert.timestamp}
                        </p>
                      )}
                      {alert.ml?.isAnomaly && (
                        <p className="text-purple-400 flex items-center gap-1">
                          🧠 ML Anomaly — score: {alert.ml.anomalyScore}
                        </p>
                      )}
                    </div>

                    {/* Recommended actions */}
                    <div className="space-y-1.5">
                      <p className="text-gray-500 font-semibold uppercase tracking-wide text-[10px] mb-2">Recommended Actions</p>
                      <ol className="space-y-1.5 list-decimal list-inside">
                        {recs.map((r, i) => (
                          <li key={i} className="text-gray-300">{r}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}