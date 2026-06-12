// src/components/ExportReports.tsx
// CSV download (from backend) + PDF generation (client-side with jsPDF)

import { useState } from 'react'
import { Download, FileText, Sheet } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const API = 'https://soc-log-analyzer-api.onrender.com'

interface Log {
  id:        string
  timestamp: string
  severity:  string
  category:  string
  sourceIp:  string
  hostname:  string
  user:      string
  message:   string
  mitre?:    string
}

interface Props {
  logs: Log[]
}

export default function ExportReports({ logs }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)

  // ── CSV: direct download from backend ──────────────────────────────────────
  const downloadCSV = async () => {
    try {
      setCsvLoading(true)
      const res  = await fetch(`${API}/api/export/csv`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `soc_logs_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('CSV download failed. Make sure the backend is running.')
    } finally {
      setCsvLoading(false)
    }
  }

  // ── PDF: generated client-side with jsPDF ──────────────────────────────────
  const downloadPDF = () => {
    try {
      setPdfLoading(true)
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      // Title
      doc.setFontSize(18)
      doc.setTextColor(30, 56, 100)
      doc.text('SOC Log Analyzer — Threat Report', 14, 18)

      // Subtitle
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated: ${new Date().toLocaleString()}   |   Author: Niha130`, 14, 26)
      doc.text(`Total Logs: ${logs.length}   |   Critical: ${logs.filter(l => l.severity === 'CRITICAL').length}   |   High: ${logs.filter(l => l.severity === 'HIGH').length}`, 14, 32)

      // Severity summary bar
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Severity Summary', 14, 42)

      const severities = ['CRITICAL','HIGH','MEDIUM','LOW','INFO']
      const colors: Record<string, [number,number,number]> = {
        CRITICAL: [220, 38, 38],
        HIGH:     [234, 88, 12],
        MEDIUM:   [202, 138, 4],
        LOW:      [22, 163, 74],
        INFO:     [59, 130, 246],
      }
      let xPos = 14
      severities.forEach(sev => {
        const count = logs.filter(l => l.severity === sev).length
        doc.setFillColor(...colors[sev])
        doc.roundedRect(xPos, 46, 40, 12, 2, 2, 'F')
        doc.setTextColor(255,255,255)
        doc.setFontSize(9)
        doc.text(`${sev}: ${count}`, xPos + 2, 54)
        xPos += 44
      })

      // Table
      autoTable(doc, {
        startY: 64,
        head: [['Time','Severity','Category','Source IP','Hostname','User','Message','MITRE']],
        body: logs.slice(0, 100).map(l => [
          l.timestamp,
          l.severity,
          l.category,
          l.sourceIp,
          l.hostname,
          l.user,
          l.message.length > 50 ? l.message.slice(0, 47) + '…' : l.message,
          l.mitre || '—',
        ]),
        styles:       { fontSize: 8, cellPadding: 2 },
        headStyles:   { fillColor: [30, 56, 100], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 20 },
          2: { cellWidth: 24 },
          3: { cellWidth: 26 },
          4: { cellWidth: 26 },
          5: { cellWidth: 20 },
          6: { cellWidth: 70 },
          7: { cellWidth: 16 },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const sev = data.cell.text[0]
            const c   = colors[sev] ?? [100, 100, 100]
            data.cell.styles.textColor = c
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
          `SOC Log Analyzer & Threat Alert System — Niha130 | Page ${i} of ${pageCount}`,
          14,
          doc.internal.pageSize.height - 8,
        )
      }

      doc.save(`soc_threat_report_${new Date().toISOString().slice(0,10)}.pdf`)
    } catch (err) {
      console.error(err)
      alert('PDF generation failed.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* CSV button */}
      <button
        onClick={downloadCSV}
        disabled={csvLoading}
        className="flex items-center gap-2 px-4 py-2 bg-green-900/40 hover:bg-green-800/60 border border-green-700 text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {csvLoading
          ? <><RefreshIcon /> Downloading…</>
          : <><Sheet size={15} /> Export CSV</>
        }
      </button>

      {/* PDF button */}
      <button
        onClick={downloadPDF}
        disabled={pdfLoading || logs.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {pdfLoading
          ? <><RefreshIcon /> Generating…</>
          : <><FileText size={15} /> Export PDF</>
        }
      </button>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 12a9 9 0 11-6.219-8.56" />
    </svg>
  )
}

// Fix for jsPDF-autoTable missing Sheet icon from lucide
function Sheet({ size }: { size: number }) {
  return <Download size={size} />
}
