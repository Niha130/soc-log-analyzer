// src/App.tsx
import React, { useState, useEffect } from 'react'
import { Shield, Volume2, VolumeX, RefreshCw } from 'lucide-react'
import { useLiveLogs } from './hooks/useLiveLogs'
import Dashboard        from './components/Dashboard'
import LogAnalyzer      from './components/LogAnalyzer'
import AlertSystem      from './components/AlertSystem'
import ThreatIntelligence from './components/ThreatIntelligence'
import DataSources      from './components/DataSources'
import AttackHeatmap    from './components/AttackHeatmap'
import AnomalyDetection from './components/AnomalyDetection'

type Tab = 'dashboard' | 'logs' | 'alerts' | 'intel' | 'heatmap' | 'anomalies' | 'sources'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dashboard',  label: 'Dashboard',      emoji: '📊' },
  { id: 'logs',       label: 'Log Analyzer',   emoji: '🔍' },
  { id: 'alerts',     label: 'Alerts',         emoji: '🚨' },
  { id: 'intel',      label: 'Threat Intel',   emoji: '🌐' },
  { id: 'heatmap',    label: 'Attack Heatmap', emoji: '🗓' },
  { id: 'anomalies',  label: 'ML Anomalies',   emoji: '🧠' },
  { id: 'sources',    label: 'Data Sources',   emoji: '🗄' },
]

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-xs text-gray-500">
      {time.toUTCString().slice(17, 25)} UTC
    </span>
  )
}

export default function App() {
  const [activeTab,     setActiveTab]     = useState<Tab>('dashboard')
  const [soundEnabled,  setSoundEnabled]  = useState(true)

  const { logs, alerts, metrics, loading, error, refetch } = useLiveLogs(soundEnabled)

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-blue-400" />
          <span className="font-mono text-sm font-bold text-white tracking-widest uppercase">
            SOC Log Analyzer
          </span>
          <span className="text-xs text-gray-500 font-mono">Threat Alert System v2.0</span>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-400 bg-red-900/30 border border-red-800 px-2 py-1 rounded">
              ⚠ Backend offline
            </span>
          )}
          <button
            onClick={() => setSoundEnabled(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition-all ${
              soundEnabled
                ? 'border-blue-700 text-blue-400 bg-blue-900/20 hover:bg-blue-900/40'
                : 'border-gray-700 text-gray-500 bg-gray-800/40 hover:bg-gray-700/40'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            Sound {soundEnabled ? 'On' : 'Off'}
          </button>

          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-all"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono ${
            loading
              ? 'border-yellow-700 text-yellow-400 bg-yellow-900/20'
              : error
              ? 'border-red-700 text-red-400 bg-red-900/20'
              : 'border-green-700 text-green-400 bg-green-900/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              loading ? 'bg-yellow-400 animate-pulse' :
              error   ? 'bg-red-400' : 'bg-green-400 animate-pulse'
            }`} />
            {loading ? 'Connecting...' : error ? 'Offline' : 'Live'}
          </div>

          <LiveClock />
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-950 shrink-0 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-900/40 text-blue-300 border border-blue-700'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 border border-transparent'
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
            {tab.id === 'alerts' && (metrics?.totalAlerts ?? 0) > 0 && (
              <span className="bg-red-900 text-red-300 text-[10px] px-1.5 rounded-full font-bold">
                {metrics?.totalAlerts}
              </span>
            )}
            {tab.id === 'anomalies' && metrics?.mlActive && (
              <span className="bg-purple-900 text-purple-300 text-[10px] px-1.5 rounded-full">ML</span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && (
          <Dashboard logs={logs} alerts={alerts} metrics={metrics} loading={loading} />
        )}
        {activeTab === 'logs' && (
          <LogAnalyzer logs={logs} isLive={!loading && !error} />
        )}
        {activeTab === 'alerts' && (
          <AlertSystem alerts={alerts} updateAlertStatus={() => {}} />
        )}
        {activeTab === 'intel' && <ThreatIntelligence />}
        {activeTab === 'heatmap' && (
          <div className="p-4"><AttackHeatmap /></div>
        )}
        {activeTab === 'anomalies' && (
          <div className="p-4"><AnomalyDetection /></div>
        )}
        {activeTab === 'sources' && <DataSources />}
      </main>
    </div>
  )
}