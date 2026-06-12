// src/components/AnomalyDetection.tsx
// Displays ML-detected anomalies from the Isolation Forest model

import { useEffect, useState } from 'react'
import { Brain, RefreshCw, AlertTriangle } from 'lucide-react'

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
  ml: {
    isAnomaly:    boolean
    anomalyScore: number
    mlStatus:     string
  }
}

const API = 'https://soc-log-analyzer-api.onrender.com'

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-900/30 border-red-700',
  HIGH:     'text-orange-400 bg-orange-900/30 border-orange-700',
  MEDIUM:   'text-yellow-400 bg-yellow-900/30 border-yellow-700',
  LOW:      'text-green-400 bg-green-900/30 border-green-700',
  INFO:     'text-blue-400 bg-blue-900/30 border-blue-700',
}

export default function AnomalyDetection() {
  const [anomalies,  setAnomalies]  = useState<AnomalyLog[]>([])
  const [mlStatus,   setMlStatus]   = useState('training')
  const [trainedOn,  setTrainedOn]  = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  const fetchAnomalies = async () => {
    try {
      setLoading(true)
      const res  = await fetch(`${API}/api/anomalies`)
      const json = await res.json()
      setAnomalies(json.anomalies || [])
      setMlStatus(json.mlStatus  || 'training')
      setTrainedOn(json.trainedOn || 0)
      setError(null)
    } catch {
      setError('Could not reach anomaly detection endpoint')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnomalies()
    const timer = setInterval(fetchAnomalies, 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-purple-400" />
          <h2 className="text-sm font-semibold text-gray-200">ML Anomaly Detection</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            mlStatus === 'active'
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
          }`}>
            {mlStatus === 'active' ? `Active — trained on ${trainedOn} samples` : 'Training…'}
          </span>
        </div>
        <button
          onClick={fetchAnomalies}
          className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800 rounded px-2 py-1 flex items-center gap-1"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* ML explanation */}
      <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg px-3 py-2">
        Using <span className="text-purple-400 font-medium">Isolation Forest</span> algorithm.
        Logs that deviate significantly from normal patterns are flagged as anomalies.
        Model retrains automatically every 50 new log entries.
      </div>

      {/* Content */}
      {loading ? (
        <div className="h-32 flex items-center justify-center text-gray-600 text-sm">
          Running anomaly detection…
        </div>
      ) : error ? (
        <div className="h-32 flex items-center justify-center text-red-400 text-sm">{error}</div>
      ) : anomalies.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-gray-600 text-sm">
          {mlStatus === 'training'
            ? 'Model is still training — anomalies will appear after 20+ logs are processed'
            : 'No anomalies detected in current dataset'}
        </div>
      ) : (
        <div className="space-y-2">
          {anomalies.map(log => (
            <div key={log.id} className={`rounded-lg border px-4 py-3 ${SEV_COLOR[log.severity] ?? 'bg-gray-800 border-gray-700'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertTriangle size={13} className="shrink-0" />
                    <span className="text-sm font-semibold truncate">{log.message}</span>
                    <span className="text-xs font-mono border border-current rounded px-1.5 py-0.5 opacity-70">
                      {log.severity}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs opacity-70">
                    <span>IP: <span className="font-mono">{log.sourceIp}</span></span>
                    <span>Host: {log.hostname}</span>
                    <span>User: {log.user}</span>
                    {log.mitre && <span className="text-purple-300">MITRE: {log.mitre}</span>}
                  </div>
                </div>

                {/* Anomaly score */}
                <div className="shrink-0 text-center">
                  <div className="text-lg font-bold text-purple-400">
                    {log.ml.anomalyScore}
                  </div>
                  <div className="text-xs text-gray-500">score</div>
                  {/* Score bar */}
                  <div className="w-16 bg-gray-700 rounded-full h-1.5 mt-1">
                    <div
                      className="h-1.5 rounded-full bg-purple-500"
                      style={{ width: `${log.ml.anomalyScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
