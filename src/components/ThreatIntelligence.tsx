import { useState } from 'react';
import { Search, Globe, Hash, Mail, Link, Cpu } from 'lucide-react';
import type { ThreatIndicator, ThreatType } from '../types';
import { generateThreatIndicators, SEVERITY_BG } from '../utils/mockData';

const TYPE_ICONS: Record<ThreatType, React.ReactNode> = {
  IP: <Globe size={13} />,
  DOMAIN: <Link size={13} />,
  HASH: <Hash size={13} />,
  URL: <Link size={13} />,
  EMAIL: <Mail size={13} />,
};

const TYPE_COLORS: Record<ThreatType, string> = {
  IP: 'text-[#ff4466]',
  DOMAIN: 'text-[#ffaa00]',
  HASH: 'text-[#a855f7]',
  URL: 'text-[#00d4ff]',
  EMAIL: 'text-[#00ff88]',
};

const indicators = generateThreatIndicators();

export default function ThreatIntelligence() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ThreatIndicator | null>(indicators[0]);
  const [filterType, setFilterType] = useState<ThreatType | 'ALL'>('ALL');

  const filtered = indicators.filter(i => {
    if (filterType !== 'ALL' && i.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.value.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.source.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex flex-col w-full lg:w-[440px] border-r border-[#1a2744] shrink-0">
        {/* Search + filter */}
        <div className="p-3 border-b border-[#1a2744] bg-[#0f1624] space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#4a5a7a]" />
            <input
              type="text"
              placeholder="Search IOCs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#0a0e17] border border-[#1a2744] rounded pl-8 pr-3 py-1.5 font-mono text-xs text-[#c8d8f0] placeholder-[#4a5a7a] focus:outline-none focus:border-[#00d4ff]/50"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['ALL', 'IP', 'DOMAIN', 'HASH', 'URL', 'EMAIL'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded border font-mono text-[10px] transition-all ${
                  filterType === t
                    ? 'border-[#00d4ff]/40 text-[#00d4ff] bg-[#00d4ff]/10'
                    : 'border-[#1a2744] text-[#4a5a7a] hover:text-[#c8d8f0]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(ioc => (
            <div
              key={ioc.id}
              onClick={() => setSelected(ioc)}
              className={`p-3 border-b border-[#1a2744]/60 cursor-pointer hover:bg-[#0f1624] transition-all ${
                selected?.id === ioc.id ? 'bg-[#0f1624] border-l-2 border-l-[#00d4ff]' : 'border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <div className={`flex items-center gap-1.5 font-mono text-xs ${TYPE_COLORS[ioc.type]}`}>
                  {TYPE_ICONS[ioc.type]}
                  <span>{ioc.type}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${SEVERITY_BG[ioc.severity]}`}>
                  {ioc.severity}
                </span>
              </div>
              <p className="font-mono text-xs text-[#c8d8f0] truncate mb-1">{ioc.value}</p>
              <div className="flex items-center gap-3 font-mono text-[10px] text-[#4a5a7a]">
                <span>{ioc.source}</span>
                <span>{ioc.hitCount} hit{ioc.hitCount !== 1 ? 's' : ''}</span>
                {ioc.country && <span>{ioc.country}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-y-auto hidden lg:block">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-[#4a5a7a] font-mono text-sm">
            <Cpu size={40} className="mr-3 opacity-20" />
            Select an indicator
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg border border-[#1a2744] bg-[#0f1624] ${TYPE_COLORS[selected.type]}`}>
                {TYPE_ICONS[selected.type]}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-xs ${TYPE_COLORS[selected.type]}`}>{selected.type}</span>
                  <span className="text-[#1a2744]">·</span>
                  <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${SEVERITY_BG[selected.severity]}`}>
                    {selected.severity}
                  </span>
                  <span className="text-[#1a2744]">·</span>
                  <span className="font-mono text-[10px] text-[#4a5a7a]">{selected.id}</span>
                </div>
                <p className="font-mono text-sm text-[#ff4466] break-all">{selected.value}</p>
              </div>
            </div>

            <p className="font-sans text-sm text-[#4a5a7a] leading-relaxed">{selected.description}</p>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 bg-[#0f1624] rounded-lg border border-[#1a2744] p-4">
              {[
                ['Source', selected.source],
                ['Country', selected.country || '—'],
                ['First Seen', selected.firstSeen.replace('T', ' ').slice(0, 19)],
                ['Last Seen', selected.lastSeen.replace('T', ' ').slice(0, 19)],
                ['Hit Count', String(selected.hitCount)],
                ['Tags', selected.tags.join(', ')],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[10px] text-[#4a5a7a] uppercase mb-0.5">{k}</p>
                  <p className="font-mono text-xs text-[#c8d8f0]">{v}</p>
                </div>
              ))}
            </div>

            {/* Hit timeline bar */}
            <div>
              <p className="font-mono text-xs text-[#4a5a7a] uppercase mb-2">Activity — Last 7 Days</p>
              <div className="flex gap-1 items-end h-14">
                {Array.from({ length: 14 }, (_, i) => {
                  const h = Math.random() * selected.hitCount;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm"
                      style={{
                        height: `${Math.max(8, (h / selected.hitCount) * 100)}%`,
                        background: h > selected.hitCount * 0.6 ? '#ff4466' : h > 0.3 ? '#ffaa00' : '#1a2744',
                        opacity: 0.8,
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[#4a5a7a] mt-1">
                <span>7d ago</span>
                <span>Now</span>
              </div>
            </div>

            {/* Related alerts note */}
            <div className="bg-[#ff4466]/5 border border-[#ff4466]/20 rounded-lg p-3">
              <p className="font-mono text-xs text-[#ff4466] mb-1">⚠ Active in Environment</p>
              <p className="font-mono text-[11px] text-[#4a5a7a]">
                This indicator has been matched {selected.hitCount} time{selected.hitCount !== 1 ? 's' : ''} in ingested logs. Review related alerts for full context.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
