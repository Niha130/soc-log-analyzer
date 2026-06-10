import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import type { Alert, AlertStatus } from '../types';
import { SEVERITY_BG, STATUS_BG } from '../utils/mockData';

interface Props {
  alerts: Alert[];
  updateAlertStatus: (id: string, status: AlertStatus) => void;
}

const STATUS_ICONS: Record<AlertStatus, React.ReactNode> = {
  OPEN: <AlertTriangle size={13} className="text-[#ff4466]" />,
  INVESTIGATING: <Clock size={13} className="text-[#ffaa00]" />,
  RESOLVED: <CheckCircle size={13} className="text-[#00ff88]" />,
  FALSE_POSITIVE: <XCircle size={13} className="text-[#4a5a7a]" />,
};

const STATUSES: AlertStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'];

export default function AlertSystem({ alerts, updateAlertStatus }: Props) {
  const [filter, setFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Alert | null>(null);

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.status === filter);

  const counts: Record<string, number> = { ALL: alerts.length };
  STATUSES.forEach(s => { counts[s] = alerts.filter(a => a.status === s).length; });

  return (
    <div className="flex h-full">
      {/* List pane */}
      <div className="flex flex-col w-full lg:w-[420px] border-r border-[#1a2744] shrink-0">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 p-3 border-b border-[#1a2744] bg-[#0f1624]">
          {(['ALL', ...STATUSES] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-all ${
                filter === s
                  ? 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30'
                  : 'text-[#4a5a7a] hover:text-[#c8d8f0] border border-transparent'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
              <span className="bg-[#1a2744] px-1 rounded text-[10px]">{counts[s]}</span>
            </button>
          ))}
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-[#4a5a7a] font-mono text-xs">
              <Shield size={24} className="mb-2 opacity-30" />
              No alerts in this category
            </div>
          )}
          {filtered.map(alert => (
            <div
              key={alert.id}
              onClick={() => setSelected(alert)}
              className={`p-3 border-b border-[#1a2744]/60 cursor-pointer transition-all hover:bg-[#0f1624] ${
                selected?.id === alert.id ? 'bg-[#0f1624] border-l-2 border-l-[#00d4ff]' : 'border-l-2 border-l-transparent'
              } ${alert.severity === 'CRITICAL' && alert.status === 'OPEN' ? 'alert-critical' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${SEVERITY_BG[alert.severity]}`}>
                  {alert.severity}
                </span>
                <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] flex items-center gap-1 ${STATUS_BG[alert.status]}`}>
                  {STATUS_ICONS[alert.status]}
                  {alert.status.replace('_', ' ')}
                </span>
              </div>
              <p className="font-mono text-xs text-[#c8d8f0] mb-1 leading-relaxed">{alert.title}</p>
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#4a5a7a]">
                <span>{alert.affectedHost}</span>
                {alert.mitreId && <span className="text-[#a855f7]">{alert.mitreId}</span>}
                <span>{alert.timestamp.slice(11, 19)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-y-auto hidden lg:block">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-[#4a5a7a]">
            <Shield size={40} className="mb-3 opacity-20" />
            <p className="font-mono text-sm">Select an alert to investigate</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded border font-mono text-xs ${SEVERITY_BG[selected.severity]}`}>
                  {selected.severity}
                </span>
                <span className="font-mono text-xs text-[#4a5a7a]">{selected.id}</span>
                {selected.mitreId && (
                  <span className="px-2 py-1 rounded border border-[#a855f7]/40 text-[#a855f7] bg-[#a855f7]/10 font-mono text-xs">
                    MITRE {selected.mitreId}
                  </span>
                )}
              </div>
              <h2 className="font-mono text-base text-[#c8d8f0] mb-2">{selected.title}</h2>
              <p className="font-sans text-sm text-[#4a5a7a] leading-relaxed">{selected.description}</p>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 bg-[#0f1624] rounded-lg border border-[#1a2744] p-4">
              {[
                ['Affected Host', selected.affectedHost],
                ['Source IP', selected.sourceIp],
                ['Category', selected.category],
                ['MITRE Tactic', selected.mitreTactic || '—'],
                ['Detected', selected.timestamp.replace('T', ' ').slice(0, 19)],
                ['Last Updated', selected.updatedAt.replace('T', ' ').slice(0, 19)],
                ['Analyst', selected.analyst || 'Unassigned'],
                ['Related Logs', selected.relatedLogs.join(', ')],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[10px] text-[#4a5a7a] uppercase mb-0.5">{k}</p>
                  <p className="font-mono text-xs text-[#c8d8f0]">{v}</p>
                </div>
              ))}
            </div>

            {/* Status actions */}
            <div>
              <p className="font-mono text-xs text-[#4a5a7a] uppercase mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      updateAlertStatus(selected.id, status);
                      setSelected(a => a ? { ...a, status } : null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-xs transition-all ${
                      selected.status === status
                        ? STATUS_BG[status]
                        : 'border-[#1a2744] text-[#4a5a7a] hover:border-[#00d4ff]/30 hover:text-[#00d4ff]'
                    }`}
                  >
                    {STATUS_ICONS[status]}
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="font-mono text-xs text-[#4a5a7a] uppercase mb-2">Alert Timeline</p>
              <div className="space-y-2">
                {[
                  { time: selected.timestamp, event: 'Alert auto-generated by detection engine', color: 'bg-[#ff4466]' },
                  { time: selected.updatedAt, event: `Status updated to ${selected.status}`, color: 'bg-[#00d4ff]' },
                  ...(selected.analyst ? [{ time: selected.updatedAt, event: `Assigned to ${selected.analyst}`, color: 'bg-[#a855f7]' }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <span className={`w-2 h-2 rounded-full ${item.color} shrink-0 mt-1`} />
                      {i < 2 && <span className="w-px h-6 bg-[#1a2744]" />}
                    </div>
                    <div>
                      <p className="font-mono text-[10px] text-[#4a5a7a]">{item.time.replace('T', ' ').slice(0, 19)}</p>
                      <p className="font-mono text-xs text-[#c8d8f0]">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
