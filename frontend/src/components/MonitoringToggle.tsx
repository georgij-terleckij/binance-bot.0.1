import { useEffect, useState } from 'react'
import axios from 'axios'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']

export default function MonitoringToggle() {
  const [activeSymbols, setActiveSymbols] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMonitoring()
  }, [])

  const loadMonitoring = async () => {
    try {
      const res = await axios.get('/api/monitoring')
      setActiveSymbols(res.data.symbols ?? [])
    } catch (err) {
      console.error('Ошибка загрузки статуса:', err)
    }
  }

  const toggleSymbol = async (symbol: string) => {
    try {
      setLoading(true)
      const isActive = activeSymbols.includes(symbol)
      await axios.post('/api/monitoring', null, {
        params: { symbol, active: !isActive },
      })

      setActiveSymbols((prev) =>
        isActive ? prev.filter((s) => s !== symbol) : [...prev, symbol]
      )
    } catch (err) {
      console.error('Ошибка переключения:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded p-4">
      <h2 className="text-lg font-bold mb-3">⚡ Монеты под слежением</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SYMBOLS.map((symbol) => {
          const isActive = activeSymbols.includes(symbol)
          return (
            <button
              key={symbol}
              onClick={() => toggleSymbol(symbol)}
              disabled={loading}
              className={`border rounded px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {isActive ? '🟢 ' : '⚪ '} {symbol}
            </button>
          )
        })}
      </div>
    </div>
  )
}
