import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import type { DataSource } from '../types';
import { generateDataSources } from '../utils/mockData';

const STATUS_STYLES = {
  ACTIVE: { badge: 'border-[#00ff88]/40 text-[#00ff88] bg-[#00ff88]/10', dot: 'bg-[#00ff88] animate-pulse', icon: <Wifi size={13} /> },
  WARNING: { badge: 'border-[#ffaa00]/40 text-[#ffaa00] bg-[#ffaa00]/10', dot: 'bg-[#ffaa00]', icon: <AlertTriangle size={13} /> },
  ERROR: { badge: 'border-[#ff4466]/40 text-[#ff4466] bg-[#ff4466]/10', dot: 'bg-[#ff4466]', icon: <WifiOff size={13} /> },
  INACTIVE: { badge: 'border-[#4a5a7a]/40 text-[#4a5a7a] bg-[#4a5a7a]/10', dot: 'bg-[#4a5a7a]', icon: <WifiOff size={13} /> },
};

const TYPE_COLORS: Record<string, string> = {
  SIEM: 'text-[#00d4ff]',
  FIREWALL: 'text-[#ff4466]',
  IDS: 'text-[#ffaa00]',
  EDR: 'text-[#a855f7]',
  PROXY: 'text-[#00ff88]',
  DNS: 'text-[#00d4ff]',
  CLOUD: 'text-[#c8d8f0]',
};

export default function DataSources() {
  const [sources] = useState<DataSource[]>(generateDataSources);
  const [lpm, setLpm] = useState<Record<string, number>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Simulate fluctuating logs-per-minute
  useEffect(() => {
    const update = () => {
      setLpm(prev => {
        const next: Record<string, number> = {};
        sources.forEach(s => {
          if (s.status === 'ACTIVE') {
            const base = s.logsPerMinute;
            next[s.id] = Math.max(0, base + Math.floor((Math.random() - 0.5) * base * 0.2));
          } else if (s.status === 'WARNING') {
            next[s.id] = Math.floor(s.logsPerMinute * 0.6 + Math.random() * s.logsPerMinute * 0.2);
          } else {
            next[s.id] = 0;
          }
        });
        return next;
      });
      setLastRefresh(new Date());
    };
    update();
    const t = setInterval(update, 3000);
    return () => clearInterval(t);
  }, [sources]);

  const totalLpm = Object.values(lpm).reduce((a, b) => a + b, 0);
  const activeSources = sources.filter(s => s.status === 'ACTIVE').length;
  const errorSources = sources.filter(s => s.status === 'ERROR' || s.status === 'WARNING').length;

  return (
    <div className="p-4 space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Sources', value: sources.length, color: 'border-[#1a2744]' },
          { label: 'Active', value: activeSources, color: 'border-[#00ff88]/30' },
          { label: 'Issues', value: errorSources, color: errorSources > 0 ? 'border-[#ff4466]/30' : 'border-[#1a2744]' },
          { label: 'Events / min', value: totalLpm.toLocaleString(), color: 'border-[#00d4ff]/30' },
        ].map(card => (
          <div key={card.label} className={`bg-[#0f1624] border ${card.color} rounded-lg p-3`}>
            <p className="font-mono text-[10px] text-[#4a5a7a] uppercase tracking-wider mb-1">{card.label}</p>
            <p className="font-mono text-2xl font-semibold text-[#c8d8f0]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Refresh indicator */}
      <div className="flex items-center gap-2 font-mono text-[10px] text-[#4a5a7a]">
        <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
        Last refresh: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 3s
      </div>

      {/* Sources grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sources.map(source => {
          const style = STATUS_STYLES[source.status];
          const currentLpm = lpm[source.id] ?? source.logsPerMinute;
          const pct = source.status !== 'ERROR' && source.logsPerMinute > 0
            ? Math.min(100, (currentLpm / source.logsPerMinute) * 100)
            : 0;

          return (
            <div
              key={source.id}
              className={`bg-[#0f1624] border rounded-lg p-4 space-y-3 ${
                source.status === 'ERROR' ? 'border-[#ff4466]/30' :
                source.status === 'WARNING' ? 'border-[#ffaa00]/30' :
                'border-[#1a2744]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-mono text-[10px] font-semibold ${TYPE_COLORS[source.type] || 'text-[#4a5a7a]'}`}>
                      {source.type}
                    </span>
                    <span className="font-mono text-[10px] text-[#4a5a7a]">{source.id}</span>
                  </div>
                  <p className="font-mono text-sm text-[#c8d8f0] font-medium">{source.name}</p>
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-[10px] ${style.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {source.status}
                </span>
              </div>

              {/* Description */}
              <p className="font-sans text-xs text-[#4a5a7a] leading-relaxed">{source.description}</p>

              {/* Connection info */}
              <div className="font-mono text-[10px] text-[#4a5a7a] space-y-0.5">
                <div className="flex justify-between">
                  <span>Endpoint</span>
                  <span className="text-[#c8d8f0]">{source.host}:{source.port}</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol</span>
                  <span className="text-[#c8d8f0]">{source.protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Events</span>
                  <span className="text-[#c8d8f0]">{source.totalEvents.toLocaleString()}</span>
                </div>
                {source.errorCount > 0 && (
                  <div className="flex justify-between">
                    <span>Errors</span>
                    <span className="text-[#ff4466]">{source.errorCount}</span>
                  </div>
                )}
              </div>

              {/* Live throughput bar */}
              <div>
                <div className="flex justify-between font-mono text-[10px] mb-1">
                  <span className="text-[#4a5a7a]">Events/min</span>
                  <span className={source.status === 'ERROR' ? 'text-[#ff4466]' : 'text-[#00ff88]'}>
                    {currentLpm.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-[#1a2744] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      source.status === 'ERROR' ? 'bg-[#ff4466]' :
                      source.status === 'WARNING' ? 'bg-[#ffaa00]' :
                      'bg-[#00ff88]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Last event */}
              <div className="flex items-center justify-between font-mono text-[10px] text-[#4a5a7a]">
                <span>Last event</span>
                <span className={source.status === 'ERROR' ? 'text-[#ff4466]' : 'text-[#c8d8f0]'}>
                  {source.lastEvent.slice(11, 19)} UTC
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
