// src/App.tsx
import { useState } from 'react'
import {
  Shield, Activity, AlertTriangle, Database,
  Cpu, Wifi, WifiOff, Volume2, VolumeX, Brain, Clock
} from 'lucide-react'
import { useLiveLogs }      from './hooks/useLiveLogs'
import Dashboard            from './components/Dashboard'
import LogAnalyzer          from './components/LogAnalyzer'
import AlertSystem          from './components/AlertSystem'
import ThreatIntelligence   from './components/ThreatIntelligence'
import DataSources          from './components/DataSources'
import AttackHeatmap        from './components/AttackHeatmap'
import AnomalyDetection     from './components/AnomalyDetection'

type Tab = 'dashboard' | 'logs' | 'alerts' | 'threats' | 'sources' | 'heatmap' | 'anomalies'

export default function App() {
  const [activeTab,    setActiveTab]    = useState<Tab>('dashboard')
  const [soundEnabled, setSoundEnabled] = useState(true)

  const { logs, alerts, metrics, loading, error, refetch } = useLiveLogs(soundEnabled)

  const openAlerts    = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length
  const mlActive      = metrics?.mlActive ?? false

  const tabs: {
    id: Tab; label: string; icon: React.ReactNode
    badge?: number; badgeColor?: string
  }[] = [
    { id: 'dashboard', label: 'Dashboard',    icon: <Activity size={15} /> },
    { id: 'logs',      label: 'Log Analyzer', icon: <Database size={15} />, badge: logs.length },
    {
      id: 'alerts', label: 'Alerts', icon: <AlertTriangle size={15} />,
      badge: openAlerts,
      badgeColor: criticalCount > 0 ? 'bg-red-600' : 'bg-orange-500',
    },
    { id: 'threats',   label: 'Threat Intel',  icon: <Cpu size={15} /> },
    { id: 'heatmap',   label: 'Attack Heatmap',icon: <Clock size={15} /> },
    {
      id: 'anomalies', label: 'ML Anomalies', icon: <Brain size={15} />,
      badgeColor: mlActive ? 'bg-purple-600' : 'bg-gray-600',
      badge: mlActive ? 1 : 0,
    },
    { id: 'sources',   label: 'Data Sources',  icon: <Database size={15} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">SOC Log Analyzer</h1>
            <p className="text-xs text-gray-500 leading-tight">Threat Alert System v2.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {/* ML badge */}
          {mlActive && (
            <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-900/40 border border-purple-700 text-purple-400">
              <Brain size={11} /> ML Active
            </div>
          )}

          {/* Critical flash */}
          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-red-900/50 border border-red-700 text-red-400 live-dot">
              <AlertTriangle size={11} />
              {criticalCount} Critical
            </div>
          )}

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              soundEnabled
                ? 'border-blue-700 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                : 'border-gray-700 bg-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span className="hidden md:inline">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={refetch}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-700 bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Refresh
          </button>

          {/* Live / offline badge */}
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            !error
              ? 'border-green-700 bg-green-900/30 text-green-400'
              : 'border-gray-700 bg-gray-800 text-gray-500'
          }`}>
            {!error
              ? <><span className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" /><Wifi size={11} /> Live</>
              : <><WifiOff size={11} /> Offline</>
            }
          </div>
        </div>
      </header>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div className="bg-yellow-900/40 border-b border-yellow-700 px-6 py-2 text-sm text-yellow-300 flex items-center gap-2">
          <AlertTriangle size={14} />
          {error} — Make sure your Render backend is running.
        </div>
      )}

      {/* ── Loading bar ──────────────────────────────────────────────── */}
      {loading && (
        <div className="h-0.5 bg-gray-800">
          <div className="h-0.5 bg-blue-500 animate-pulse w-full" />
        </div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <nav className="bg-gray-900 border-b border-gray-800 px-4 flex gap-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className={`ml-0.5 text-white text-xs rounded-full px-1.5 py-0.5 leading-none ${t.badgeColor ?? 'bg-blue-600'}`}>
                {t.badge > 999 ? '999+' : t.badge === 1 && t.id === 'anomalies' ? 'ON' : t.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-5">
        {activeTab === 'dashboard'  && <Dashboard logs={logs} alerts={alerts} metrics={metrics} />}
        {activeTab === 'logs'       && <LogAnalyzer logs={logs} />}
        {activeTab === 'alerts'     && <AlertSystem alerts={alerts} onResolve={() => {}} />}
        {activeTab === 'threats'    && <ThreatIntelligence logs={logs} alerts={alerts} />}
        {activeTab === 'heatmap'    && <AttackHeatmap />}
        {activeTab === 'anomalies'  && <AnomalyDetection />}
        {activeTab === 'sources'    && <DataSources connected={!error} metrics={null} />}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 px-6 py-2 text-xs text-gray-600 flex justify-between items-center">
        <span>SOC Log Analyzer & Threat Alert System v2.0</span>
        <span>
          Built by{' '}
          <a href="https://github.com/Niha130" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">
            Niha130
          </a>
        </span>
      </footer>
    </div>
  )
}
