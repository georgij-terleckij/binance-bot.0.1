import CandlestickChart from './components/CandlestickChart'
import GridTable from './components/GridTable'
import MonitoringToggle from './components/MonitoringToggle'
import GridTradeSettings from './components/GridTradeSettings'
import LogsTable from './components/LogsTable'
import GridTradeControl from './components/GridTradeControl'

export default function App() {
  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">📈 Binance Grid Bot</h1>

      {/* 🔁 Монеты под слежением */}
      <MonitoringToggle />

      {/* 📊 График */}
      <CandlestickChart />

      {/* ⚙️ Настройка уровней */}
      <GridTradeSettings />

      {/* 📋 Таблица уровней */}
      <GridTable />
      <GridTradeControl symbol="BTCUSDT" />
      <LogsTable />
    </div>
  )
}
