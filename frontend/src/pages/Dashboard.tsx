import SymbolCard from '../components/SymbolCard'
import SymbolsList from '../components/SymbolsList'

export default function Dashboard() {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <h1>Dashboard</h1>
        <SymbolsList />

      <SymbolCard symbol="BTCUSDT" />
      <SymbolCard symbol="ETHUSDT" />
    </div>
  )
}
