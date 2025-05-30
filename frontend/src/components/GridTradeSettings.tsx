// src/components/GridTradeSettings.tsx
import React, { useState } from 'react'
import axios from 'axios'

type OrderSide = {
  price: string
  quantity: string
}

type GridLevel = {
  buy: OrderSide
  sell: OrderSide
}

export default function GridTradeSettings() {
  const [levels, setLevels] = useState<GridLevel[]>([
    { buy: { price: '', quantity: '' }, sell: { price: '', quantity: '' } },
  ])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleChange = (
    index: number,
    side: 'buy' | 'sell',
    field: 'price' | 'quantity',
    value: string
  ) => {
    const updated = [...levels]
    updated[index][side][field] = value
    setLevels(updated)
  }

  const addLevel = () => {
    setLevels([
      ...levels,
      { buy: { price: '', quantity: '' }, sell: { price: '', quantity: '' } },
    ])
  }

  const removeLevel = (index: number) => {
    setLevels(levels.filter((_, i) => i !== index))
  }

  const submit = async () => {
    setLoading(true)
    setMessage(null)
    try {
      await axios.post('/api/grid-trade', {
        symbol: 'BTCUSDT',
        levels: levels.map((l) => ({
          triggered: false,
          status: '',
          buy: l.buy,
          sell: l.sell,
        })),
      })
      setMessage('✅ Сетка успешно сохранена')
    } catch (err) {
      console.error('Ошибка при сохранении сетки:', err)
      setMessage('❌ Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">⚙️ Настройка уровней</h3>

      {levels.map((level, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 items-center">
          <input
            type="text"
            placeholder="Buy Price"
            value={level.buy.price}
            onChange={(e) =>
              handleChange(i, 'buy', 'price', e.target.value)
            }
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="Buy Qty"
            value={level.buy.quantity}
            onChange={(e) =>
              handleChange(i, 'buy', 'quantity', e.target.value)
            }
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="Sell Price"
            value={level.sell.price}
            onChange={(e) =>
              handleChange(i, 'sell', 'price', e.target.value)
            }
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            type="text"
            placeholder="Sell Qty"
            value={level.sell.quantity}
            onChange={(e) =>
              handleChange(i, 'sell', 'quantity', e.target.value)
            }
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={() => removeLevel(i)}
            className="text-red-600 text-sm hover:underline"
          >
            Удалить
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-3 mt-2">
        <button
          onClick={addLevel}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm rounded"
        >
          + Добавить уровень
        </button>
        <button
          onClick={submit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm rounded disabled:opacity-50"
        >
          💾 Сохранить
        </button>
      </div>

      {message && (
        <div className="text-sm mt-2 text-gray-700 bg-gray-100 p-2 rounded border border-gray-300">
          {message}
        </div>
      )}
    </div>
  )
}
