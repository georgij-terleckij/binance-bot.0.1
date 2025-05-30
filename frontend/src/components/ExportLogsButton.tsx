import { exportLogs } from '../api/logs'

interface Props {
  symbol: string
}

export default function ExportLogsButton({ symbol }: Props) {
  const handleExport = async () => {
    const blob = await exportLogs(symbol)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${symbol}-logs.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="mt-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm rounded"
    >
      Export Logs
    </button>
  )
}
