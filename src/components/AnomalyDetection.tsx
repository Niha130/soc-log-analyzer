// src/components/AnomalyDetection.tsx
import { useEffect, useState } from 'react'
import { Brain, RefreshCw, AlertTriangle } from 'lucide-react'

const API = 'http://localhost:8000'

interface AnomalyLog {
  id:        string
  timestamp: string
  severity:  string
  category:  string
  sourceIp:  string
  hostname:  string
  user:      string
  message:   string
  mitre:     string
  anomaly:   boolean
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-900/30 border-red-700',
  HIGH:     'text-orange-400 bg-orange-900/30 border-orange-700',
  MEDIUM:   'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  LOW:      'text-green-400 bg-green-900/30 border-green-700',
  INFO:     'text-blue-400 bg-blue-900/30 border-blue-700',
}

export default function AnomalyDetection() {
  const [anomalies,   setAnomalies]   = useState<AnomalyLog[]>([])
  const [totalScanned, setTotalScanned] = useState(0)
  const [mlEnabled,   setMlEnabled]   = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const fetchAnomalies = async () => {
    try {
      setLoading(true)
      const res  = await fetch(`${API}/api/anomalies`)
      const json = await res.json()
      setAnomalies(json.anomalies     || [])
      setTotalScanned(json.total_scanned ?? json.totalScanned ?? 0)
      setMlEnabled(json.ml_enabled    ?? json.mlEnabled ?? false)
      setError(null)
    } catch {
      setError('Could not reach anomaly detection endpoint')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnomalies()
    const t = setInterval(fetchAnomalies, 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Brain size={18} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-200">ML Anomaly Detection</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
            mlEnabled
              ? 'bg-green-900/50 text-green-400 border-green-700'
              : 'bg-yellow-900/50 text-yellow-400 border-yellow-700'
          }`}>
            {mlEnabled
              ? `Active — scanned ${totalScanned} logs`
              : 'Isolation Forest — waiting for data'}
          </span>
        </div>
        <button
          onClick={fetchAnomalies}
          className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800 rounded px-2 py-1 flex items-center gap-1 transition-all"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Info box */}
      <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
        Uses <span className="text-purple-400 font-medium">Isolation Forest</span> algorithm.
        Logs that deviate significantly from normal patterns are flagged as anomalies.
        Model retrains automatically on each batch of logs.
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-gray-600 text-sm animate-pulse">
          Running anomaly detection...
        </div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-red-400 text-sm">
          {error}
        </div>
      ) : anomalies.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-gray-600 text-sm text-center gap-2">
          <Brain size={28} className="text-gray-700" />
          <span>
            {mlEnabled
              ? 'No anomalies detected in current dataset ✓'
              : 'ML model training — anomalies appear after logs are processed'}
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {anomalies.map(log => (
            <div
              key={log.id}
              className={`rounded-lg border px-4 py-3 ${SEV_COLOR[log.severity] ?? 'bg-gray-800 border-gray-700 text-gray-300'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span className="text-sm font-semibold truncate">{log.message}</span>
                    <span className="text-xs font-mono border border-current rounded px-1.5 py-0.5 opacity-70">
                      {log.severity}
                    </span>
                    <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700 rounded px-1.5 py-0.5">
                      ANOMALY
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs opacity-70">
                    <span>IP: <span className="font-mono">{log.sourceIp}</span></span>
                    <span>Host: {log.hostname}</span>
                    <span>User: {log.user}</span>
                    <span>Category: {log.category}</span>
                    {log.mitre && (
                      <span className="text-purple-300">MITRE: {log.mitre}</span>
                    )}
                  </div>
                  <div className="text-xs opacity-50 mt-1">{log.timestamp}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer stats */}
      {!loading && !error && (
        <div className="pt-2 border-t border-gray-800 flex gap-6 text-xs text-gray-600">
          <span>Scanned: <span className="text-gray-400 font-mono">{totalScanned}</span></span>
          <span>Anomalies: <span className="text-purple-400 font-mono">{anomalies.length}</span></span>
          <span>ML: <span className={mlEnabled ? 'text-green-400' : 'text-yellow-400'}>
            {mlEnabled ? 'Isolation Forest Active' : 'Training...'}
          </span></span>
        </div>
      )}
    </div>
  )
}