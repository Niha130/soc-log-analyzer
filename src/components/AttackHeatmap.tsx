// src/components/AttackHeatmap.tsx
// Shows attack frequency grouped by hour of the day (0-23)

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Clock } from 'lucide-react'

interface HeatmapEntry {
  hour:  number
  label: string
  count: number
}

const API = 'https://soc-log-analyzer-api.onrender.com'

function getColor(count: number, max: number): string {
  if (max === 0) return '#1e3a5f'
  const ratio = count / max
  if (ratio > 0.75) return '#dc2626'   // red   — very high
  if (ratio > 0.50) return '#ea580c'   // orange — high
  if (ratio > 0.25) return '#ca8a04'   // yellow — medium
  return '#1d4ed8'                      // blue   — low
}

export default function AttackHeatmap() {
  const [data,    setData]    = useState<HeatmapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchHeatmap = async () => {
    try {
      setLoading(true)
      const res  = await fetch(`${API}/api/heatmap`)
      const json = await res.json()
      setData(json.heatmap || [])
      setError(null)
    } catch {
      setError('Could not load heatmap data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHeatmap()
    // Auto-refresh every 60 seconds
    const timer = setInterval(fetchHeatmap, 60_000)
    return () => clearInterval(timer)
  }, [])

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const peakHour = data.reduce((a, b) => (b.count > a.count ? b : a), data[0])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-200">Attack Heatmap — By Hour of Day</h2>
        </div>
        <button
          onClick={fetchHeatmap}
          className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 rounded px-2 py-1"
        >
          Refresh
        </button>
      </div>

      {/* Peak hour callout */}
      {!loading && peakHour && (
        <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-800 rounded-lg text-xs text-red-300">
          Peak attack time: <span className="font-bold">{peakHour.label}</span> with{' '}
          <span className="font-bold">{peakHour.count}</span> events
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
          Loading heatmap…
        </div>
      ) : error ? (
        <div className="h-48 flex items-center justify-center text-red-400 text-sm">
          {error}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              interval={2}
              angle={-45}
              textAnchor="end"
              height={40}
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number) => [`${value} events`, 'Attacks']}
              labelFormatter={(label) => `Time: ${label}`}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.count, maxCount)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Color legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-700 inline-block" /> Low</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-600 inline-block" /> Medium</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-600 inline-block" /> High</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600 inline-block" /> Critical</span>
      </div>
    </div>
  )
}
