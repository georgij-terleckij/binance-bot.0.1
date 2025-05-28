import React, { useEffect, useState } from 'react'
import axios from 'axios'

type LogEntry = {
  symbol: string
  type: 'BUY' | 'SELL'
  price: string
  timestamp: number
}

export default function LogsTable() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    loadLogs()
    const interval = setInterval(loadLogs, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadLogs = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/logs?symbol=BTCUSDT')
      setLogs(res.data.logs.reverse()) // последние сверху
    } catch (err) {
      console.error('Ошибка загрузки логов:', err)
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-2">📜 История сигналов</h2>
      <table className="w-full text-sm border text-center">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-1 px-2">#</th>
            <th className="py-1 px-2">Тип</th>
            <th className="py-1 px-2">Цена</th>
            <th className="py-1 px-2">Время</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={i} className="border-t">
              <td>{i + 1}</td>
              <td className={log.type === 'BUY' ? 'text-green-600' : 'text-red-600'}>{log.type}</td>
              <td>{log.price}</td>
              <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
