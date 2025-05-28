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
    { buy: { price: '', quantity: '' }, sell: { price: '', quantity: '' } }
  ])

  const handleChange = (index: number, side: 'buy' | 'sell', field: 'price' | 'quantity', value: string) => {
    const updated = [...levels]
    updated[index][side][field] = value
    setLevels(updated)
  }

  const addLevel = () => {
    setLevels([...levels, { buy: { price: '', quantity: '' }, sell: { price: '', quantity: '' } }])
  }

  const removeLevel = (index: number) => {
    setLevels(levels.filter((_, i) => i !== index))
  }

  const submit = async () => {
    await axios.post('/api/grid-trade', {
      symbol: 'BTCUSDT',
      levels: levels.map(l => ({
        triggered: false,
        status: '',
        buy: l.buy,
        sell: l.sell
      }))
    })

    alert('Сетка сохранена!')
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">⚙️ Настройка сетки ордеров</h2>

      {levels.map((level, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
          <input
            type="text"
            placeholder="Buy Price"
            value={level.buy.price}
            onChange={e => handleChange(i, 'buy', 'price', e.target.value)}
            className="border px-2 py-1"
          />
          <input
            type="text"
            placeholder="Buy Qty"
            value={level.buy.quantity}
            onChange={e => handleChange(i, 'buy', 'quantity', e.target.value)}
            className="border px-2 py-1"
          />
          <input
            type="text"
            placeholder="Sell Price"
            value={level.sell.price}
            onChange={e => handleChange(i, 'sell', 'price', e.target.value)}
            className="border px-2 py-1"
          />
          <input
            type="text"
            placeholder="Sell Qty"
            value={level.sell.quantity}
            onChange={e => handleChange(i, 'sell', 'quantity', e.target.value)}
            className="border px-2 py-1"
          />
          <button onClick={() => removeLevel(i)} className="text-red-500 text-sm">Удалить</button>
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        <button onClick={addLevel} className="bg-blue-500 text-white px-4 py-2 rounded">+ Добавить уровень</button>
        <button onClick={submit} className="bg-green-600 text-white px-4 py-2 rounded">💾 Сохранить</button>
      </div>
    </div>
  )
}
