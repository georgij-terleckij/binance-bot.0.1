import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';

type WSMessage = {
  type: string;
  result?: boolean;
  data?: any;
  symbol?: string;
  message?: string;
  timestamp?: string;
  [key: string]: any;
};

type GridEvent = {
  type: string;
  symbol: string;
  message: string;
  timestamp: string;
  data: any;
};

type State = {
  isConnected: boolean;
  isAuthenticated: boolean;
  latest?: any;
  settings?: any;
  lastBuyPrice?: any;
  reconnectAttempts: number;
  lastError?: string;
  // Новые поля для grid events
  gridEvents: GridEvent[];
  gridStatuses: { [symbol: string]: any };
  lastGridEvent?: GridEvent;
};

type Action =
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'AUTHENTICATED'; payload: boolean }
  | { type: 'LATEST'; payload: any }
  | { type: 'SETTING_UPDATE_RESULT'; payload: any }
  | { type: 'SYMBOL_UPDATE_LAST_BUY_PRICE_RESULT'; payload: any }
  | { type: 'SYMBOL_TRIGGER_BUY_RESULT'; payload: any }
  | { type: 'SYMBOL_TRIGGER_SELL_RESULT'; payload: any }
  | { type: 'MANUAL_TRADE_RESULT'; payload: any }
  | { type: 'RECONNECT_ATTEMPT'; payload: number }
  | { type: 'ERROR'; payload: string }
  // Новые действия для grid events
  | { type: 'GRID_EVENT'; payload: GridEvent }
  | { type: 'CLEAR_GRID_EVENTS' }
  | { type: 'OTHER'; payload: any };

const initialState: State = {
  isConnected: false,
  isAuthenticated: false,
  reconnectAttempts: 0,
  gridEvents: [],
  gridStatuses: {}
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, isConnected: true, reconnectAttempts: 0, lastError: undefined };
    case 'DISCONNECTED':
      return { ...state, isConnected: false, isAuthenticated: false };
    case 'AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'LATEST':
      return { ...state, latest: action.payload };
    case 'SETTING_UPDATE_RESULT':
      return { ...state, settings: action.payload };
    case 'SYMBOL_UPDATE_LAST_BUY_PRICE_RESULT':
      return { ...state, lastBuyPrice: action.payload };
    case 'SYMBOL_TRIGGER_BUY_RESULT':
    case 'SYMBOL_TRIGGER_SELL_RESULT':
    case 'MANUAL_TRADE_RESULT':
      console.log(`Trade result:`, action.payload);
      return state;
    case 'RECONNECT_ATTEMPT':
      return { ...state, reconnectAttempts: action.payload };
    case 'ERROR':
      return { ...state, lastError: action.payload };
    case 'GRID_EVENT':
      const gridEvent = action.payload;
      const newGridEvents = [gridEvent, ...state.gridEvents].slice(0, 100); // Храним последние 100 событий

      // Обновляем статус символа
      const newGridStatuses = { ...state.gridStatuses };
      if (gridEvent.symbol) {
        newGridStatuses[gridEvent.symbol] = {
          ...newGridStatuses[gridEvent.symbol],
          lastEvent: gridEvent,
          lastUpdate: new Date().toISOString(),
          ...gridEvent.data // Добавляем данные события в статус
        };
      }

      return {
        ...state,
        gridEvents: newGridEvents,
        gridStatuses: newGridStatuses,
        lastGridEvent: gridEvent
      };
    case 'CLEAR_GRID_EVENTS':
      return { ...state, gridEvents: [], lastGridEvent: undefined };
    case 'OTHER':
    default:
      return state;
  }
}

type WSContextType = {
  state: State;
  sendMessage: (msg: object) => void;
  reconnect: () => void;
  clearGridEvents: () => void;
  subscribeToGridEvents: (symbols?: string[]) => void;
  getGridStatus: (symbol: string) => any;
  getGridEvents: (symbol?: string) => GridEvent[];
};

const WSContext = createContext<WSContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{
  url: string;
  children: React.ReactNode;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}> = ({
  url,
  children,
  maxReconnectAttempts = 5,
  reconnectInterval = 5000
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  const isManualClose = useRef(false);

  const cleanup = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  }, []);

  // Функция для логирования grid событий в консоль
  const logGridEvent = useCallback((event: GridEvent) => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = getEventEmoji(event.type);

    console.group(`${emoji} Grid Event [${timestamp}]`);
    console.log(`🎯 Type: ${event.type}`);
    console.log(`💰 Symbol: ${event.symbol}`);
    console.log(`📝 Message: ${event.message}`);
    console.log(`⏰ Timestamp: ${event.timestamp}`);

    if (event.data && Object.keys(event.data).length > 0) {
      console.log(`📊 Data:`, event.data);
    }

    // Дополнительное логирование для разных типов событий
    switch (event.type) {
      case 'grid-started':
        console.log(`✅ Grid активирован! Уровней: ${event.data?.levels_count || 'N/A'}`);
        break;
      case 'grid-stopped':
        console.log(`⏹️ Grid остановлен!`);
        break;
      case 'grid-level-triggered':
        console.log(`🎯 Сработал уровень #${event.data?.level_index} (${event.data?.side})`);
        break;
      case 'grid-settings-updated':
        console.log(`⚙️ Настройки обновлены! Уровней: ${event.data?.levels_count || 'N/A'}`);
        break;
    }

    console.groupEnd();
  }, []);

  // Функция для получения эмодзи по типу события
  const getEventEmoji = (eventType: string): string => {
    const emojiMap: { [key: string]: string } = {
      'grid-started': '🟢',
      'grid-stopped': '🔴',
      'grid-level-triggered': '🎯',
      'grid-settings-updated': '⚙️',
      'grid-default-created': '📋',
      'grid-status-requested': '❓',
      'test-event': '🧪'
    };
    return emojiMap[eventType] || '📡';
  };

  const connect = useCallback(() => {
    // Предотвращаем множественные подключения
    if (wsRef.current?.readyState === WebSocket.CONNECTING ||
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    console.log(`🔌 Connecting to WebSocket: ${url}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      dispatch({ type: 'CONNECTED' });
      isManualClose.current = false;

      // Автоматически подписываемся на grid события
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          channel: 'grid-trade',
          symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT'] // Можно настроить
        }));
        console.log('📬 Auto-subscribed to grid events');
      }, 1000);

      // Устанавливаем пинг каждые 25 секунд
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        // Проверяем, не является ли сообщение простым ping
        if (event.data === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        const message: WSMessage = JSON.parse(event.data);

        // Обрабатываем pong от сервера
        if (message.type === 'pong' || message.type === 'welcome') {
          return;
        }

        console.log('📨 Received message:', message);

        // Проверяем, является ли это grid событием
        if (message.type && (message.type.startsWith('grid-') || message.type === 'test-event')) {
          const gridEvent: GridEvent = {
            type: message.type,
            symbol: message.symbol || 'UNKNOWN',
            message: message.message || `Grid event: ${message.type}`,
            timestamp: message.timestamp || new Date().toISOString(),
            data: message.data || {}
          };

          // Логируем событие в консоль
          logGridEvent(gridEvent);

          // Сохраняем в состояние
          dispatch({ type: 'GRID_EVENT', payload: gridEvent });
          return;
        }

        // Обработка по типу сообщения (ваша существующая логика)
        switch (message.type) {
          case 'latest':
            dispatch({ type: 'LATEST', payload: message });
            break;
          case 'setting-update-result':
            dispatch({ type: 'SETTING_UPDATE_RESULT', payload: message });
            break;
          case 'symbol-update-last-buy-price-result':
            dispatch({ type: 'SYMBOL_UPDATE_LAST_BUY_PRICE_RESULT', payload: message });
            break;
          case 'symbol-trigger-buy-result':
            dispatch({ type: 'SYMBOL_TRIGGER_BUY_RESULT', payload: message });
            break;
          case 'symbol-trigger-sell-result':
            dispatch({ type: 'SYMBOL_TRIGGER_SELL_RESULT', payload: message });
            break;
          case 'manual-trade-result':
            dispatch({ type: 'MANUAL_TRADE_RESULT', payload: message });
            break;
          case 'auth-result':
            dispatch({ type: 'AUTHENTICATED', payload: message.result || false });
            break;
          default:
            dispatch({ type: 'OTHER', payload: message });
            break;
        }
      } catch (err) {
        console.error('❌ WS message parse error:', err);
        dispatch({ type: 'ERROR', payload: 'Message parse error' });
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      cleanup();
      dispatch({ type: 'DISCONNECTED' });

      // Реконнект только если закрытие не было ручным
      if (!isManualClose.current && state.reconnectAttempts < maxReconnectAttempts) {
        const nextAttempt = state.reconnectAttempts + 1;
        dispatch({ type: 'RECONNECT_ATTEMPT', payload: nextAttempt });

        console.log(`🔄 Reconnecting in ${reconnectInterval}ms... (attempt ${nextAttempt}/${maxReconnectAttempts})`);

        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, reconnectInterval * Math.min(nextAttempt, 3));
      } else if (state.reconnectAttempts >= maxReconnectAttempts) {
        dispatch({ type: 'ERROR', payload: 'Max reconnection attempts reached' });
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WS error:', err);
      dispatch({ type: 'ERROR', payload: 'WebSocket error' });
    };
  }, [url, state.reconnectAttempts, maxReconnectAttempts, reconnectInterval, cleanup, logGridEvent]);

  const reconnect = useCallback(() => {
    isManualClose.current = true;
    dispatch({ type: 'RECONNECT_ATTEMPT', payload: 0 });
    wsRef.current?.close();
    setTimeout(() => connect(), 100);
  }, [connect]);

  const clearGridEvents = useCallback(() => {
    dispatch({ type: 'CLEAR_GRID_EVENTS' });
    console.log('🧹 Grid events cleared');
  }, []);

  const subscribeToGridEvents = useCallback((symbols: string[] = []) => {
    const subscriptionMessage = {
      type: 'subscribe',
      channel: 'grid-trade',
      symbols: symbols.map(s => s.toUpperCase())
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(subscriptionMessage));
      console.log('📬 Subscribed to grid events for symbols:', symbols);
    } else {
      console.warn('⚠️ Cannot subscribe - WebSocket not connected');
    }
  }, []);

  // Вспомогательные функции для получения данных
  const getGridStatus = useCallback((symbol: string) => {
    return state.gridStatuses[symbol.toUpperCase()];
  }, [state.gridStatuses]);

  const getGridEvents = useCallback((symbol?: string) => {
    if (symbol) {
      return state.gridEvents.filter(event => event.symbol === symbol.toUpperCase());
    }
    return state.gridEvents;
  }, [state.gridEvents]);

  useEffect(() => {
    connect();

    return () => {
      isManualClose.current = true;
      cleanup();
      wsRef.current?.close();
    };
  }, [connect, cleanup]);

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      console.log('📤 Sent message:', msg);
    } else {
      console.warn('⚠️ WS not connected, cannot send message. Current state:', wsRef.current?.readyState);
      dispatch({ type: 'ERROR', payload: 'Cannot send message - not connected' });
    }
  }, []);

  return (
    <WSContext.Provider value={{
      state,
      sendMessage,
      reconnect,
      clearGridEvents,
      subscribeToGridEvents,
      getGridStatus,
      getGridEvents
    }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WSContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};