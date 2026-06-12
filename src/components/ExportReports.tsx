import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const API = 'https://soc-log-analyzer-api.onrender.com'

interface Log {
  id: string
  timestamp: string
  severity: string
  category: string
  sourceIp: string
  hostname: string
  user: string
  message: string
  mitre?: string
}

interface Props {
  logs: Log[]
}

export default function ExportReports({ logs }: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)

  const downloadCSV = async () => {
    try {
      setCsvLoading(true)

      const res = await fetch(`${API}/api/export/csv`)
      const blob = await res.blob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = `soc_logs_${new Date().toISOString().slice(0, 10)}.csv`

      document.body.appendChild(a)
      a.click()
      a.remove()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      alert('CSV download failed.')
    } finally {
      setCsvLoading(false)
    }
  }

  const downloadPDF = () => {
    try {
      setPdfLoading(true)

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      doc.setFontSize(18)
      doc.text('SOC Log Analyzer Threat Report', 14, 18)

      doc.setFontSize(10)
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        14,
        26
      )

      autoTable(doc, {
        startY: 35,
        head: [
          [
            'Time',
            'Severity',
            'Category',
            'Source IP',
            'Hostname',
            'User',
            'Message',
            'MITRE',
          ],
        ],
        body: logs.map((log) => [
          log.timestamp,
          log.severity,
          log.category,
          log.sourceIp,
          log.hostname,
          log.user,
          log.message,
          log.mitre || '-',
        ]),
        styles: {
          fontSize: 8,
        },
      })

      doc.save(
        `soc_threat_report_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      )
    } catch (error) {
      console.error(error)
      alert('PDF generation failed.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={downloadCSV}
        disabled={csvLoading}
        className="flex items-center gap-2 px-4 py-2 bg-green-900/40 border border-green-700 text-green-400 rounded-lg"
      >
        {csvLoading ? (
          <>
            <RefreshIcon />
            Downloading...
          </>
        ) : (
          <>
            <Download size={15} />
            Export CSV
          </>
        )}
      </button>

      <button
        onClick={downloadPDF}
        disabled={pdfLoading || logs.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-blue-900/40 border border-blue-700 text-blue-400 rounded-lg"
      >
        {pdfLoading ? (
          <>
            <RefreshIcon />
            Generating...
          </>
        ) : (
          <>
            <FileText size={15} />
            Export PDF
          </>
        )}
      </button>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg
      className="animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  )
}