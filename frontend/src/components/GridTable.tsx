// src/components/GridTable.tsx
import { useEffect, useState } from 'react'
import axios from 'axios'

type OrderSide = {
  price: string
  quantity: string
}

type GridLevel = {
  triggered: boolean
  status: string
  buy: OrderSide
  sell: OrderSide
}

export default function GridTable() {
  const [levels, setLevels] = useState<GridLevel[]>([])
  const [price, setPrice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [gridRes, priceRes] = await Promise.all([
        axios.get('http://localhost:8000/api/grid-trade?symbol=BTCUSDT'),
        axios.get('http://localhost:8000/api/price?symbol=BTCUSDT')
      ])

      setLevels(gridRes.data.gridTrade || [])
      setPrice(priceRes.data.price || '—')
    } catch (err: any) {
      setError('❌ Не удалось загрузить данные')
      console.error('Ошибка при загрузке:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">📈 Binance Grid Bot UI</h1>

      <div className="mb-4 text-lg">
        <strong>Текущая цена:</strong>{' '}
        <span className="font-mono text-green-600">{price ?? '—'}</span>
      </div>

      {loading && <div className="mb-4 text-gray-500">Загрузка уровней...</div>}
      {error && <div className="mb-4 text-red-500">{error}</div>}

      {levels.length === 0 && !loading ? (
        <div className="text-gray-500">Нет доступных уровней</div>
      ) : (
        <table className="w-full border text-sm text-center">
          <thead className="bg-gray-200">
            <tr>
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">Buy Price</th>
              <th className="py-2 px-2">Sell Price</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Triggered</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level, index) => (
              <tr key={index} className="border-t hover:bg-gray-50">
                <td className="py-1">{index + 1}</td>
                <td>{level.buy.price}</td>
                <td>{level.sell.price}</td>
                <td className="text-blue-600">{level.status}</td>
                <td>{level.triggered ? '✅' : '⏳'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
