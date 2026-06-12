import AttackHeatmap    from './AttackHeatmap'
import AnomalyDetection from './AnomalyDetection'
import ExportReports    from '../components/ExportReports'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Shield, Activity, TrendingUp, Eye, Zap } from 'lucide-react';
import type { LogEntry, Alert, ThreatStats, TimeSeriesPoint } from '../types';
import { SEVERITY_BG } from '../utils/mockData';

interface Props {
  logs: LogEntry[];
  alerts: Alert[];
  stats: ThreatStats;
  timeSeries: TimeSeriesPoint[];
}

const StatCard = ({
  label, value, sub, color, icon
}: { label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode }) => (
  <div className={`bg-[#0f1624] border ${color} rounded-lg p-4 relative overflow-hidden`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="font-mono text-xs text-[#4a5a7a] uppercase tracking-wider mb-1">{label}</p>
        <p className="font-mono text-3xl font-semibold text-[#c8d8f0]">{value}</p>
        {sub && <p className="font-mono text-xs text-[#4a5a7a] mt-1">{sub}</p>}
      </div>
      <div className="opacity-20 scale-150">{icon}</div>
    </div>
  </div>
);

const PIE_COLORS = ['#ff4466', '#ffaa00', '#a855f7', '#00d4ff', '#4a5a7a'];

export default function Dashboard({ logs, alerts, stats, timeSeries }: Props) {
  // Category breakdown
  const categoryCount: Record<string, number> = {};
  logs.forEach(l => {
    categoryCount[l.category] = (categoryCount[l.category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  // Severity pie
  const pieData = [
    { name: 'Critical', value: stats.critical },
    { name: 'High', value: stats.high },
    { name: 'Medium', value: stats.medium },
    { name: 'Low', value: stats.low },
  ];

  const recentAlerts = alerts.filter(a => a.status === 'OPEN' || a.status === 'INVESTIGATING').slice(0, 5);
  const recentLogs = logs.slice(0, 8);

  return (
    <div className="p-4 space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Events" value={stats.total} sub="last 500 logs" color="border-[#1a2744]" icon={<Activity size={32} className="text-[#00d4ff]" />} />
        <StatCard label="Critical" value={stats.critical} color="border-[#ff4466]/30 glow-red" icon={<Zap size={32} className="text-[#ff4466]" />} />
        <StatCard label="High" value={stats.high} color="border-[#ffaa00]/30" icon={<AlertTriangle size={32} className="text-[#ffaa00]" />} />
        <StatCard label="Medium" value={stats.medium} color="border-[#a855f7]/30" icon={<Eye size={32} className="text-[#a855f7]" />} />
        <StatCard label="Open Alerts" value={stats.openAlerts} color="border-[#ff4466]/30" icon={<Shield size={32} className="text-[#ff4466]" />} />
        <StatCard label="Resolved" value={stats.resolvedToday} sub="today" color="border-[#00ff88]/30" icon={<TrendingUp size={32} className="text-[#00ff88]" />} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Time series */}
        <div className="lg:col-span-2 bg-[#0f1624] border border-[#1a2744] rounded-lg p-4">
          <p className="font-mono text-xs text-[#4a5a7a] uppercase tracking-wider mb-4">Event Volume — Last 20 min</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timeSeries} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
              <defs>
                {[['critical', '#ff4466'], ['high', '#ffaa00'], ['medium', '#a855f7'], ['low', '#00d4ff']].map(([k, c]) => (
                  <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#4a5a7a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4a5a7a', fontSize: 10, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f1624', border: '1px solid #1a2744', borderRadius: 6, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                labelStyle={{ color: '#c8d8f0' }}
                itemStyle={{ color: '#4a5a7a' }}
              />
              <Area type="monotone" dataKey="critical" stroke="#ff4466" fill="url(#grad-critical)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="high" stroke="#ffaa00" fill="url(#grad-high)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="medium" stroke="#a855f7" fill="url(#grad-medium)" strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="low" stroke="#00d4ff" fill="url(#grad-low)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-4 mt-2">
            {[['Critical', '#ff4466'], ['High', '#ffaa00'], ['Medium', '#a855f7'], ['Low', '#00d4ff']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span className="font-mono text-[10px] text-[#4a5a7a]">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie */}
        <div className="bg-[#0f1624] border border-[#1a2744] rounded-lg p-4">
          <p className="font-mono text-xs text-[#4a5a7a] uppercase tracking-wider mb-2">Severity Distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f1624', border: '1px solid #1a2744', borderRadius: 6, fontFamily: 'JetBrains Mono', fontSize: 11 }}
                labelStyle={{ color: '#c8d8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-[#4a5a7a]">{d.name}</span>
                </div>
                <span className="text-[#c8d8f0]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Alerts */}
        <div className="bg-[#0f1624] border border-[#1a2744] rounded-lg p-4">
          <p className="font-mono text-xs text-[#4a5a7a] uppercase tracking-wider mb-3">Active Threats</p>
          <div className="space-y-2">
            {recentAlerts.map(alert => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-2.5 rounded border ${
                  alert.severity === 'CRITICAL' ? 'border-[#ff4466]/30 bg-[#ff4466]/5' : 'border-[#1a2744] bg-[#0a0e17]/50'
                }`}
              >
                <span className={`mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold ${SEVERITY_BG[alert.severity]}`}>
                  {alert.severity.slice(0, 4)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-[#c8d8f0] truncate">{alert.title}</p>
                  <p className="font-mono text-[10px] text-[#4a5a7a] mt-0.5">{alert.affectedHost} · {alert.mitreId || alert.category}</p>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  alert.status === 'INVESTIGATING' ? 'border-[#ffaa00]/40 text-[#ffaa00] bg-[#ffaa00]/10' : 'border-[#ff4466]/40 text-[#ff4466] bg-[#ff4466]/10'
                }`}>
                  {alert.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent logs */}
        <div className="bg-[#0f1624] border border-[#1a2744] rounded-lg p-4">
          <p className="font-mono text-xs text-[#4a5a7a] uppercase tracking-wider mb-3">Recent Events</p>
          <div className="space-y-1.5">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-center gap-2 font-mono text-[11px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.severity === 'CRITICAL' ? 'bg-[#ff4466]' :
                  log.severity === 'HIGH' ? 'bg-[#ffaa00]' :
                  log.severity === 'MEDIUM' ? 'bg-[#a855f7]' : 'bg-[#4a5a7a]'
                }`} />
                <span className="text-[#4a5a7a] shrink-0">{log.timestamp.slice(11, 19)}</span>
                <span className="text-[#00d4ff] shrink-0">{log.hostname}</span>
                <span className="text-[#c8d8f0] truncate">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
