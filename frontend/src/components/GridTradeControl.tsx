// src/components/GridTradeControl.tsx
import { useState } from 'react'
import axios from 'axios'

type Props = {
  symbol: string
}

export default function GridTradeControl({ symbol }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleAction = async (action: 'start' | 'stop') => {
    try {
      setLoading(true)
      setMessage(null)
      const url = `/api/grid-trade/${action}?symbol=${symbol}`
      const res = await axios.post(url)
      setMessage(res.data.message)
    } catch (err: any) {
      setMessage('❌ Ошибка выполнения действия')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <button
          onClick={() => handleAction('start')}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded shadow disabled:opacity-60"
        >
          ▶️ Старт
        </button>

        <button
          onClick={() => handleAction('stop')}
          disabled={loading}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded shadow disabled:opacity-60"
        >
          ⏹️ Стоп
        </button>
      </div>

      {message && (
        <div className="text-sm text-gray-700 bg-gray-100 p-2 rounded border">
          {message}
        </div>
      )}
    </div>
  )
}
