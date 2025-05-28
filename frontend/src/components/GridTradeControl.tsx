import { useState } from 'react'
import axios from 'axios'

interface Props {
  symbol: string
}

export default function GridTradeControl({ symbol }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'started' | 'stopped'>('idle')

  const startTrade = async () => {
    try {
      setLoading(true)
      await axios.post(`/api/grid-trade/start`, null, { params: { symbol } })
      setStatus('started')
    } catch (err) {
      alert('Ошибка запуска торговли')
    } finally {
      setLoading(false)
    }
  }

  const stopTrade = async () => {
    try {
      setLoading(true)
      await axios.post(`/api/grid-trade/stop`, null, { params: { symbol } })
      setStatus('stopped')
    } catch (err) {
      alert('Ошибка остановки торговли')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="my-4">
      <div className="flex items-center gap-4">
        <button
          onClick={startTrade}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          ▶️ Старт
        </button>
        <button
          onClick={stopTrade}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          ⏹️ Стоп
        </button>

        <span className="text-sm text-gray-600">
          {status === 'started' && '🟢 Торговля активна'}
          {status === 'stopped' && '🔴 Остановлена'}
        </span>
      </div>
    </div>
  )
}
