interface Props {
  logs: {
    action: 'buy' | 'sell'
    price: number
    timestamp: string
  }[]
}

export default function LogsTable({ logs }: Props) {
  return (
    <div className="mt-4 text-sm">
      <h3 className="font-bold text-white mb-2">Logs</h3>
      <table className="w-full text-left border border-gray-700">
        <thead className="bg-gray-700 text-xs uppercase">
          <tr>
            <th className="p-2">Time</th>
            <th className="p-2">Price</th>
            <th className="p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <tr key={idx} className="border-t border-gray-800">
              <td className="p-2 text-gray-400">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="p-2">${log.price.toFixed(2)}</td>
              <td
                className={`p-2 font-bold ${
                  log.action === 'buy' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {log.action.toUpperCase()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
