import { useState, useMemo } from 'react';
import { Search, Filter, Download, ChevronDown, ChevronRight } from 'lucide-react';
import type { LogEntry, Severity, LogCategory } from '../types';
import { SEVERITY_BG } from '../utils/mockData';

interface Props {
  logs: LogEntry[];
  isLive: boolean;
}

const CATEGORIES: LogCategory[] = ['AUTH', 'NETWORK', 'SYSTEM', 'MALWARE', 'INTRUSION', 'DATA_EXFIL', 'RECON', 'POLICY'];
const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export default function LogAnalyzer({ logs, isLive }: Props) {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [filterThreat, setFilterThreat] = useState<'ALL' | 'THREATS'>('ALL');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) return false;
      if (filterCategory !== 'ALL' && log.category !== filterCategory) return false;
      if (filterThreat === 'THREATS' && !log.isThreat) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.message.toLowerCase().includes(q) ||
          log.sourceIp.includes(q) ||
          log.hostname.toLowerCase().includes(q) ||
          (log.user?.toLowerCase().includes(q) ?? false) ||
          log.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, filterSeverity, filterCategory, filterThreat]);

  const exportCsv = () => {
    const header = 'ID,Timestamp,Severity,Category,SourceIP,Hostname,User,Message\n';
    const rows = filtered.map(l =>
      `"${l.id}","${l.timestamp}","${l.severity}","${l.category}","${l.sourceIp}","${l.hostname}","${l.user || ''}","${l.message.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `soc-logs-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-[#1a2744] bg-[#0f1624] shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5a7a]" />
          <input
            type="text"
            placeholder="Search IP, host, message, user..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0a0e17] border border-[#1a2744] rounded px-8 py-1.5 font-mono text-xs text-[#c8d8f0] placeholder-[#4a5a7a] focus:outline-none focus:border-[#00d4ff]/50"
          />
        </div>

        {/* Severity filter */}
        <div className="relative">
          <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5a7a]" />
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as Severity | 'ALL')}
            className="bg-[#0a0e17] border border-[#1a2744] rounded pl-7 pr-6 py-1.5 font-mono text-xs text-[#c8d8f0] focus:outline-none focus:border-[#00d4ff]/50 appearance-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as LogCategory | 'ALL')}
          className="bg-[#0a0e17] border border-[#1a2744] rounded px-2 py-1.5 font-mono text-xs text-[#c8d8f0] focus:outline-none focus:border-[#00d4ff]/50 cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Threat toggle */}
        <button
          onClick={() => setFilterThreat(f => f === 'ALL' ? 'THREATS' : 'ALL')}
          className={`px-3 py-1.5 rounded border font-mono text-xs transition-all ${
            filterThreat === 'THREATS'
              ? 'border-[#ff4466]/50 text-[#ff4466] bg-[#ff4466]/10'
              : 'border-[#1a2744] text-[#4a5a7a] hover:border-[#ff4466]/30 hover:text-[#ff4466]'
          }`}
        >
          Threats Only
        </button>

        <div className="flex-1" />

        <span className="font-mono text-xs text-[#4a5a7a]">{filtered.length.toLocaleString()} events</span>

        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#1a2744] text-[#4a5a7a] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 font-mono text-xs transition-all"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      {/* Log table header */}
      <div className="grid grid-cols-[90px_130px_80px_90px_120px_100px_1fr] gap-2 px-3 py-2 border-b border-[#1a2744] bg-[#0a0e17] shrink-0">
        {['ID', 'TIMESTAMP', 'SEV', 'CATEGORY', 'SOURCE IP', 'HOST', 'MESSAGE'].map(h => (
          <span key={h} className="font-mono text-[10px] text-[#4a5a7a] uppercase tracking-wider">{h}</span>
        ))}
      </div>

      {/* Log rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((log, idx) => (
          <div key={log.id}>
            <div
              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              className={`grid grid-cols-[90px_130px_80px_90px_120px_100px_1fr] gap-2 px-3 py-2 border-b border-[#1a2744]/50 cursor-pointer transition-colors hover:bg-[#0f1624] ${
                idx < 3 && isLive ? 'log-new' : ''
              } ${log.severity === 'CRITICAL' ? 'bg-[#ff4466]/5' : ''}`}
            >
              <span className="font-mono text-[11px] text-[#4a5a7a]">{log.id}</span>
              <span className="font-mono text-[11px] text-[#4a5a7a]">{log.timestamp.slice(11, 23)}</span>
              <span>
                <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${SEVERITY_BG[log.severity]}`}>
                  {log.severity.slice(0, 4)}
                </span>
              </span>
              <span className="font-mono text-[11px] text-[#00d4ff]">{log.category}</span>
              <span className={`font-mono text-[11px] ${log.isThreat ? 'text-[#ff4466]' : 'text-[#c8d8f0]'}`}>{log.sourceIp}</span>
              <span className="font-mono text-[11px] text-[#a855f7]">{log.hostname}</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] text-[#c8d8f0] truncate">{log.message}</span>
                {expandedLog === log.id ? <ChevronDown size={11} className="text-[#4a5a7a] shrink-0" /> : <ChevronRight size={11} className="text-[#4a5a7a] shrink-0" />}
              </div>
            </div>

            {/* Expanded raw log */}
            {expandedLog === log.id && (
              <div className="px-4 py-3 bg-[#0a0e17] border-b border-[#1a2744] space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px]">
                  {[
                    ['User', log.user || '—'],
                    ['Protocol', log.protocol || '—'],
                    ['Port', String(log.port || '—')],
                    ['Bytes', log.bytes ? log.bytes.toLocaleString() : '—'],
                    ['Dest IP', log.destIp || '—'],
                    ['Country', log.country || '—'],
                    ['Threat', log.isThreat ? 'YES' : 'NO'],
                    ['Tags', log.tags.join(', ')],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[#4a5a7a]">{k}: </span>
                      <span className={k === 'Threat' && v === 'YES' ? 'text-[#ff4466]' : 'text-[#c8d8f0]'}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#0f1624] rounded border border-[#1a2744] p-2">
                  <p className="font-mono text-[10px] text-[#4a5a7a] mb-1">RAW LOG</p>
                  <p className="font-mono text-[11px] text-[#00ff88] break-all">{log.rawLog}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
