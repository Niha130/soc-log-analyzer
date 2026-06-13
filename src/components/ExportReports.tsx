// src/components/ExportReports.tsx
import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface LogEntry {
  id:        string
  timestamp: string
  severity:  string
  category:  string
  sourceIp:  string
  hostname:  string
  user:      string
  message:   string
  protocol?: string
  port?:     number
  bytes?:    number
  country?:  string
  mitre?:    string
}

interface Props {
  logs: LogEntry[]
}

export default function ExportReports({ logs }: Props) {
  const [exporting, setExporting] = useState(false)

  // ── Export CSV ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (logs.length === 0) return
    setExporting(true)

    const headers = [
      'ID','Timestamp','Severity','Category','Source IP',
      'Hostname','User','Message','Protocol','Port','Bytes','Country','MITRE'
    ]
    const rows = logs.map(l => [
      l.id, l.timestamp, l.severity, l.category, l.sourceIp,
      l.hostname, l.user, `"${l.message.replace(/"/g,'""')}"`,
      l.protocol ?? '', l.port ?? '', l.bytes ?? '',
      l.country ?? '', l.mitre ?? ''
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = `soc_report_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  // ── Export PDF ──────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (logs.length === 0) return
    setExporting(true)

    const doc = new jsPDF({ orientation: 'landscape' })

    // Title
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('SOC Log Analyzer — Security Report', 14, 16)

    // Subtitle
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleString()}  |  Total logs: ${logs.length}  |  Author: Niha130`, 14, 23)

    // Summary stats
    const critical = logs.filter(l => l.severity === 'CRITICAL').length
    const high     = logs.filter(l => l.severity === 'HIGH').length
    const medium   = logs.filter(l => l.severity === 'MEDIUM').length
    const low      = logs.filter(l => l.severity === 'LOW').length
    const threats  = logs.filter(l => ['CRITICAL','HIGH'].includes(l.severity)).length

    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(
      `Summary — Critical: ${critical}  High: ${high}  Medium: ${medium}  Low: ${low}  Threats: ${threats}`,
      14, 30
    )

    // Table
    autoTable(doc, {
      startY: 35,
      head: [['Time', 'Severity', 'Category', 'Source IP', 'Hostname', 'User', 'Message', 'MITRE']],
      body: logs.slice(0, 100).map(l => [
        l.timestamp?.slice(0,19) ?? '',
        l.severity,
        l.category,
        l.sourceIp,
        l.hostname,
        l.user,
        l.message.length > 60 ? l.message.slice(0, 57) + '...' : l.message,
        l.mitre ?? ''
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [17, 24, 39],
        textColor: [156, 163, 175],
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const sev = data.cell.raw as string
          if (sev === 'CRITICAL') data.cell.styles.textColor = [220, 38, 38]
          else if (sev === 'HIGH') data.cell.styles.textColor = [234, 88, 12]
          else if (sev === 'MEDIUM') data.cell.styles.textColor = [202, 138, 4]
          else if (sev === 'LOW')  data.cell.styles.textColor = [22, 163, 74]
        }
      }
    })

    doc.save(`soc_report_${new Date().toISOString().slice(0,10)}.pdf`)
    setExporting(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportCSV}
        disabled={exporting || logs.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-green-700 text-green-400 bg-green-900/20 hover:bg-green-900/40 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Download size={13} />
        Export CSV
      </button>

      <button
        onClick={exportPDF}
        disabled={exporting || logs.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-700 text-blue-400 bg-blue-900/20 hover:bg-blue-900/40 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileText size={13} />
        Export PDF
      </button>
    </div>
  )
}