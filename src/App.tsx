import { useState } from 'react';
import { Shield, Activity, AlertTriangle, Database, Globe, Terminal } from 'lucide-react';
import { useLiveLogs } from './hooks/useLiveLogs';
import Dashboard from './components/Dashboard';
import LogAnalyzer from './components/LogAnalyzer';
import AlertSystem from './components/AlertSystem';
import ThreatIntelligence from './components/ThreatIntelligence';
import DataSources from './components/DataSources';

type Tab = 'dashboard' | 'logs' | 'alerts' | 'intel' | 'sources';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={15} /> },
  { id: 'logs', label: 'Log Analyzer', icon: <Terminal size={15} /> },
  { id: 'alerts', label: 'Alerts', icon: <AlertTriangle size={15} /> },
  { id: 'intel', label: 'Threat Intel', icon: <Globe size={15} /> },
  { id: 'sources', label: 'Data Sources', icon: <Database size={15} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { logs, alerts, isLive, toggleLive, newLogCount, timeSeries, stats, updateAlertStatus } = useLiveLogs();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a0e17]">
      {/* Top Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1a2744] bg-[#0f1624] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-[#00d4ff]" />
            <span className="font-mono text-sm font-semibold text-[#c8d8f0] tracking-widest uppercase">
              SOC<span className="text-[#00d4ff]">·</span>ANALYZER
            </span>
          </div>
          <div className="h-4 w-px bg-[#1a2744]" />
          <span className="font-mono text-xs text-[#4a5a7a]">niha130</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <button
            onClick={toggleLive}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border font-mono text-xs transition-all ${
              isLive
                ? 'border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/10 hover:bg-[#00ff88]/20'
                : 'border-[#4a5a7a]/50 text-[#4a5a7a] bg-[#4a5a7a]/10 hover:bg-[#4a5a7a]/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-[#00ff88] animate-pulse' : 'bg-[#4a5a7a]'}`} />
            {isLive ? 'LIVE' : 'PAUSED'}
            {isLive && newLogCount > 0 && (
              <span className="ml-1 bg-[#00ff88]/20 text-[#00ff88] px-1 rounded text-[10px]">
                +{newLogCount}
              </span>
            )}
          </button>

          {/* Open alerts badge */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#4a5a7a]">OPEN ALERTS</span>
            <span className={`px-2 py-0.5 rounded border font-semibold ${
              stats.openAlerts > 3
                ? 'border-[#ff4466]/50 text-[#ff4466] bg-[#ff4466]/10'
                : 'border-[#ffaa00]/50 text-[#ffaa00] bg-[#ffaa00]/10'
            }`}>
              {stats.openAlerts}
            </span>
          </div>

          {/* Clock */}
          <LiveClock />
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="flex items-center gap-1 px-4 py-2 border-b border-[#1a2744] bg-[#0a0e17] shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30'
                : 'text-[#4a5a7a] hover:text-[#c8d8f0] hover:bg-[#1a2744]/60 border border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'alerts' && stats.openAlerts > 0 && (
              <span className="bg-[#ff4466]/20 text-[#ff4466] text-[10px] px-1 rounded-sm">
                {stats.openAlerts}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <Dashboard logs={logs} alerts={alerts} stats={stats} timeSeries={timeSeries} />}
        {activeTab === 'logs' && <LogAnalyzer logs={logs} isLive={isLive} />}
        {activeTab === 'alerts' && <AlertSystem alerts={alerts} updateAlertStatus={updateAlertStatus} />}
        {activeTab === 'intel' && <ThreatIntelligence />}
        {activeTab === 'sources' && <DataSources />}
      </main>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useState(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  });

  return (
    <span className="font-mono text-xs text-[#4a5a7a]">
      {time.toUTCString().slice(17, 25)}{' '}
      <span className="text-[#1a2744]">UTC</span>
    </span>
  );
}
