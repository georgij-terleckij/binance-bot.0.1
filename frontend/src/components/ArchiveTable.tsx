interface Props {
  rows: {
    symbol: string
    profit: number
    profitPercentage: number
    trades: number
    archivedAt: string
  }[]
}

export default function ArchiveTable({ rows }: Props) {
  return (
    <div className="mt-4 text-sm">
      <h3 className="font-bold text-white mb-2">Archive</h3>
      <table className="w-full text-left border border-gray-700">
        <thead className="bg-gray-700 text-xs uppercase">
          <tr>
            <th className="p-2">Symbol</th>
            <th className="p-2">Trades</th>
            <th className="p-2">Profit</th>
            <th className="p-2">%</th>
            <th className="p-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-t border-gray-800">
              <td className="p-2">{row.symbol}</td>
              <td className="p-2">{row.trades}</td>
              <td
                className={`p-2 ${
                  row.profit >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {row.profit.toFixed(2)}
              </td>
              <td className="p-2">{row.profitPercentage.toFixed(2)}%</td>
              <td className="p-2 text-gray-400">
                {new Date(row.archivedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
