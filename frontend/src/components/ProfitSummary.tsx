interface Props {
  stats: {
    profit?: number
    profitPercentage?: number
    trades?: number
  }
}

export default function ProfitSummary({ stats }: Props) {
  const profit = Number(stats.profit ?? 0)
  const profitPercentage = Number(stats.profitPercentage ?? 0)
  const trades = Number(stats.trades ?? 0)

  return (
    <div className="grid grid-cols-3 gap-4 text-center text-sm mt-4">
      <div className="bg-gray-800 rounded p-3">
        <div className="text-gray-400">Profit</div>
        <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          ${profit.toFixed(2)}
        </div>
      </div>
      <div className="bg-gray-800 rounded p-3">
        <div className="text-gray-400">Profit %</div>
        <div className="text-lg font-bold">{profitPercentage.toFixed(2)}%</div>
      </div>
      <div className="bg-gray-800 rounded p-3">
        <div className="text-gray-400">Trades</div>
        <div className="text-lg font-bold">{trades}</div>
      </div>
    </div>
  )
}
