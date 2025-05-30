import { useEffect, useState } from 'react'
import { useWebSocket } from '../websocket/WebSocketClient'
import {
  getPrice,
  getGridStatus,
  getGrid,
  startGrid,
  stopGrid
} from '../api/symbol'
import { getLogs } from '../api/logs'
import LogsTable from './LogsTable'
import GridTradeTable from './GridTradeTable'
import ExportLogsButton from './ExportLogsButton'

interface Props {
  symbol: string
}

export default function SymbolCard({ symbol }: Props) {
  const [price, setPrice] = useState(0)
  const [status, setStatus] = useState('—')
  const [grid, setGrid] = useState([])
  const [logs, setLogs] = useState([])

  // WebSocket состояние
  const { state, getGridStatus: getWsGridStatus, getGridEvents } = useWebSocket()

  // Получаем grid статус и события для символа из WebSocket
  const wsGridStatus = getWsGridStatus(symbol)
  const symbolEvents = getGridEvents(symbol)

  useEffect(() => {
    getPrice(symbol).then(setPrice)
    getGridStatus(symbol).then(setStatus)
    getGrid(symbol).then(setGrid)
    getLogs(symbol).then(setLogs)
  }, [symbol])

  // Обновляем статус на основе WebSocket событий
  useEffect(() => {
    if (wsGridStatus && wsGridStatus.lastEvent) {
      const lastEvent = wsGridStatus.lastEvent
      console.log(`🔄 [${symbol}] Status update from WebSocket:`, lastEvent.type)

      // Обновляем статус на основе последнего события
      if (lastEvent.type === 'grid-started') {
        setStatus('active')
      } else if (lastEvent.type === 'grid-stopped') {
        setStatus('inactive')
      }
    }
  }, [wsGridStatus, symbol])

  // Логируем события для этого символа
  useEffect(() => {
    if (symbolEvents.length > 0) {
      const latestEvent = symbolEvents[0]
      console.log(`📊 [${symbol}] Total events: ${symbolEvents.length}, Latest: ${latestEvent.type}`)
    }
  }, [symbolEvents, symbol])

  const handleStartGrid = async () => {
    try {
      console.log(`🟢 [${symbol}] Starting grid...`)
      await startGrid(symbol)
      setStatus('active')
      console.log(`✅ [${symbol}] Grid started successfully`)
    } catch (error) {
      console.error(`❌ [${symbol}] Failed to start grid:`, error)
    }
  }

  const handleStopGrid = async () => {
    try {
      console.log(`🔴 [${symbol}] Stopping grid...`)
      await stopGrid(symbol)
      setStatus('inactive')
      console.log(`✅ [${symbol}] Grid stopped successfully`)
    } catch (error) {
      console.error(`❌ [${symbol}] Failed to stop grid:`, error)
    }
  }

  // Определяем цвет индикатора на основе статуса и WebSocket данных
  const getStatusColor = () => {
    if (wsGridStatus?.status === 'active' || status === 'active') return 'bg-green-600'
    if (wsGridStatus?.status === 'inactive' || status === 'inactive') return 'bg-red-600'
    return 'bg-gray-600'
  }

  const getStatusText = () => {
    if (wsGridStatus?.status) return wsGridStatus.status.toUpperCase()
    return status.toUpperCase()
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow hover:shadow-lg">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">{symbol}</h2>
        <div className="flex items-center gap-2">
          {/* WebSocket connection indicator */}
          <div className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-green-400' : 'bg-red-400'}`}
               title={`WebSocket: ${state.isConnected ? 'Connected' : 'Disconnected'}`} />

          {/* Status badge */}
          <span className={`text-xs px-2 py-1 rounded ${getStatusColor()}`}>
            {getStatusText()}
          </span>

          {/* Events indicator */}
          {symbolEvents.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white"
                  title={`${symbolEvents.length} grid events received`}>
              📊 {symbolEvents.length}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-2">
        Price: <span className="text-white">${price.toFixed(2)}</span>
      </p>

      {/* WebSocket status info */}
      {wsGridStatus && (
        <div className="text-xs text-gray-400 mt-1">
          Last update: {new Date(wsGridStatus.lastUpdate).toLocaleTimeString()}
          {wsGridStatus.lastEvent && (
            <span className="ml-2 text-blue-400">
              ({wsGridStatus.lastEvent.type})
            </span>
          )}
        </div>
      )}

      <GridTradeTable levels={grid} />

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleStartGrid}
          disabled={!state.isConnected}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed px-3 py-1 text-sm rounded transition-colors"
          title={!state.isConnected ? 'WebSocket disconnected' : ''}
        >
          Start
        </button>
        <button
          onClick={handleStopGrid}
          disabled={!state.isConnected}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed px-3 py-1 text-sm rounded transition-colors"
          title={!state.isConnected ? 'WebSocket disconnected' : ''}
        >
          Stop
        </button>

        {/* Debug button - можно удалить в продакшене */}
        <button
          onClick={() => {
            console.group(`🔍 [${symbol}] Debug Info`)
            console.log('API Status:', status)
            console.log('WS Status:', wsGridStatus)
            console.log('Events:', symbolEvents)
            console.log('WS Connected:', state.isConnected)
            console.groupEnd()
          }}
          className="bg-purple-600 hover:bg-purple-700 px-3 py-1 text-sm rounded text-white"
          title="Log debug info to console"
        >
          🔍
        </button>
      </div>

      {/* Recent events display */}
      {symbolEvents.length > 0 && (
        <div className="mt-3 p-2 bg-gray-700 rounded text-xs">
          <div className="text-gray-300 mb-1">Recent Events:</div>
          {symbolEvents.slice(0, 3).map((event, index) => (
            <div key={index} className="flex justify-between items-center py-1">
              <span className="text-gray-400">
                {getEventEmoji(event.type)} {event.type.replace('grid-', '')}
              </span>
              <span className="text-gray-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {symbolEvents.length > 3 && (
            <div className="text-gray-500 text-center">
              +{symbolEvents.length - 3} more events
            </div>
          )}
        </div>
      )}

      <LogsTable logs={logs} />
      <ExportLogsButton symbol={symbol} />
    </div>
  )
}

// Helper function для эмодзи событий
function getEventEmoji(eventType: string): string {
  const emojiMap: { [key: string]: string } = {
    'grid-started': '🟢',
    'grid-stopped': '🔴',
    'grid-level-triggered': '🎯',
    'grid-settings-updated': '⚙️',
    'grid-default-created': '📋'
  }
  return emojiMap[eventType] || '📡'
}