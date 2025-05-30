import { useEffect, useState } from 'react'
import { getArchive } from '../api/archive'
import ArchiveTable from '../components/ArchiveTable'
import ProfitSummary from '../components/ProfitSummary'
import DeleteArchiveButton from '../components/DeleteArchiveButton'

export default function ArchivePage() {
  const [rows, setRows] = useState<any[]>([])
  const [stats, setStats] = useState({ profit: 0, profitPercentage: 0, trades: 0 })

  useEffect(() => {
    getArchive('BTCUSDT').then((data) => setRows(data.rows))
    getArchive('BTCUSDT').then((data) => {
      setRows(data.rows)
      setStats(data.stats)
    })
  }, [])

  return (
    <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Archive</h1>
      <ProfitSummary stats={stats} />
      <DeleteArchiveButton
              query={{ symbol: 'BTCUSDT' }}
              onDeleted={() => setRows([])}
            />
      <ArchiveTable rows={rows} />
    </div>
  )
}
