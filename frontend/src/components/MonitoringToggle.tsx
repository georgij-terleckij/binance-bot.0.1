import React, { useEffect, useState } from 'react'
import axios from 'axios'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']

export default function MonitoringToggle() {
  const [activeSymbols, setActiveSymbols] = useState<string[]>([])

  useEffect(() => {
    loadMonitoring()
  }, [])

  const loadMonitoring = async () => {
    const res = await axios.get('/api/monitoring')
    setActiveSymbols(res.data.symbols ?? [])
  }

  const toggleSymbol = async (symbol: string) => {
    const isActive = activeSymbols.includes(symbol)
    await axios.post('/api/monitoring', null, {
      params: { symbol, active: !isActive }
    })

    setActiveSymbols(prev =>
      isActive ? prev.filter(s => s !== symbol) : [...prev, symbol]
    )
  }

  return (
    <div className="monitoring-toggle">
      <h4 className="mb-2 font-bold">Монеты под слежением:</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {SYMBOLS.map(symbol => (
          <label key={symbol} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={activeSymbols.includes(symbol)}
              onChange={() => toggleSymbol(symbol)}
            />
            <span>{symbol}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
