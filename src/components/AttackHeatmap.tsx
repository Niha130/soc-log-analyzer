// src/components/AttackHeatmap.tsx
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const API = 'https://soc-log-analyzer-api.onrender.com'

interface HeatCell {
  day:      string
  dayIndex: number
  hour:     number
  count:    number
}

export default function AttackHeatmap() {
  const [data,     setData]     = useState<HeatCell[]>([])
  const [loading,  setLoading]  = useState(true)
  const [maxCount, setMaxCount] = useState(1)

  const fetchHeatmap = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`${API}/api/heatmap`)
      const json = await res.json()
      const cells: HeatCell[] = json.heatmap || []
      setData(cells)
      setMaxCount(Math.max(...cells.map(c => c.count), 1))
    } catch {
      console.error('Heatmap fetch failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHeatmap()
  }, [])

  const getColor = (count: number) => {
    if (count === 0) return '#111827'
    const intensity = count / maxCount
    if (intensity < 0.25) return '#1e3a5f'
    if (intensity < 0.5)  return '#1d4ed8'
    if (intensity < 0.75) return '#f97316'
    return '#ef4444'
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🗓</span>
          <h2 className="text-sm font-semibold text-gray-300">
            Attack Heatmap — By Hour of Day
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Low</span>
            {['#1e3a5f','#1d4ed8','#f97316','#ef4444'].map(c => (
              <div key={c} style={{ background: c }} className="w-3.5 h-3.5 rounded-sm" />
            ))}
            <span>High</span>
          </div>
          <button
            onClick={fetchHeatmap}
            className="text-xs text-gray-500 hover:text-white border border-gray-700 rounded px-2 py-1 flex items-center gap-1 transition-all"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-600 text-sm animate-pulse">
          Loading heatmap data...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">

            {/* Day labels */}
            <div className="flex flex-col gap-1">
              <div className="h-5 w-10" />
              {days.map(d => (
                <div key={d} className="h-5 w-10 flex items-center text-[10px] font-mono text-gray-500">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid columns (one per hour) */}
            <div className="flex gap-1">
              {hours.map(h => (
                <div key={h} className="flex flex-col gap-1">
                  {/* Hour label */}
                  <div className="h-5 w-5 flex items-center justify-center text-[9px] font-mono text-gray-600">
                    {h % 6 === 0 ? `${h}h` : ''}
                  </div>
                  {/* Day cells for this hour */}
                  {days.map((day, di) => {
                    const cell  = data.find(c => c.dayIndex === di && c.hour === h)
                    const count = cell?.count ?? 0
                    return (
                      <div
                        key={day}
                        style={{ background: getColor(count) }}
                        className="w-5 h-5 rounded-sm cursor-pointer transition-transform hover:scale-125 relative group"
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 border border-gray-700 text-white text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                          {day} {String(h).padStart(2,'0')}:00 — {count} attack{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary row */}
      {!loading && data.length > 0 && (() => {
        const peak = data.reduce((a, b) => a.count > b.count ? a : b)
        const total = data.reduce((s, c) => s + c.count, 0)
        return (
          <div className="mt-3 pt-3 border-t border-gray-800 flex gap-6 text-xs text-gray-500">
            <span>Total attacks: <span className="text-white font-mono">{total}</span></span>
            <span>Peak: <span className="text-red-400 font-mono">{peak.day} {String(peak.hour).padStart(2,'0')}:00</span> ({peak.count})</span>
            <span>Tracking: <span className="text-blue-400">Last 7 days</span></span>
          </div>
        )
      })()}
    </div>
  )
}