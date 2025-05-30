interface GridLevel {
  triggered: boolean
  buy: {
    price: string
    quantity: string
  }
  sell: {
    price: string
    quantity: string
  }
}

interface Props {
  levels: GridLevel[]
}

export default function GridTradeTable({ levels }: Props) {
  return (
    <div className="mt-4 border-t border-gray-700 pt-2 text-sm">
      {levels.map((level, index) => (
        <div
          key={index}
          className="flex justify-between items-center py-1 border-b border-gray-700"
        >
          <div>
            <span className="text-gray-400">Grid Trade #{index + 1}</span>
            {level.triggered && (
              <span className="ml-2 text-green-400 text-xs">🟢 Triggered</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-green-300">
              Buy: {level.buy.price} × {level.buy.quantity}
            </div>
            <div className="text-red-300">
              Sell: {level.sell.price} × {level.sell.quantity}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
