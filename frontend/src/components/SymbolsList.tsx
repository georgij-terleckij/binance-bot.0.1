import React from 'react';
import { useWebSocket } from '../websocket/WebSocketClient';

export default function SymbolsList() {
  const { state, sendMessage } = useWebSocket();

  const symbols = state.latest?.stats?.symbols || [];

  return (
    <div>
      <h2 className="text-white text-lg mb-2">Symbols</h2>
      <ul>
        {symbols.map((symbol: any) => (
          <li key={symbol.symbol} className="text-gray-300 mb-1">
            <b>{symbol.symbol}</b> — Price: {symbol.lastPrice} — Status: {symbol.isActionDisabled ? 'Disabled' : 'Active'}
            <button
              onClick={() => sendMessage({ type: 'symbol-trigger-buy', data: { symbol: symbol.symbol } })}
              className="ml-2 bg-green-600 px-2 rounded text-white"
            >
              Buy
            </button>
            <button
              onClick={() => sendMessage({ type: 'symbol-trigger-sell', data: { symbol: symbol.symbol } })}
              className="ml-2 bg-red-600 px-2 rounded text-white"
            >
              Sell
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
