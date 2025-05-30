// src/services/websocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8001/ws';

export interface WebSocketMessage {
  type: 'bot_status' | 'price_update' | 'trade_executed' | 'order_update' | 'notification' | 'error';
  data: any;
  timestamp: string;
}

export interface WebSocketState {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  error: string | null;
  reconnectAttempts: number;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Already connecting'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.notifyListeners('connection', {
            type: 'connection' as any,
            data: { connected: true },
            timestamp: new Date().toISOString()
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('📨 WebSocket Message:', message);
            this.notifyListeners(message.type, message);
            this.notifyListeners('*', message); // Уведомить всех слушателей
          } catch (error) {
            console.error('❌ WebSocket message parsing error:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket Disconnected');
          this.isConnecting = false;
          this.notifyListeners('connection', {
            type: 'connection' as any,
            data: { connected: false },
            timestamp: new Date().toISOString()
          });
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket Error:', error);
          this.isConnecting = false;
          this.notifyListeners('error', {
            type: 'error',
            data: { error: 'WebSocket connection error' },
            timestamp: new Date().toISOString()
          });
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket is not connected');
    }
  }

  subscribe(eventType: string, callback: (message: WebSocketMessage) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Возвращаем функцию для отписки
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  private notifyListeners(eventType: string, message: WebSocketMessage) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(message));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;

      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton экземпляр
const wsService = new WebSocketService();
export default wsService;

// React Hook для WebSocket
export function useWebSocket() {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    error: null,
    reconnectAttempts: 0
  });

  const messageHandlers = useRef<Map<string, (message: WebSocketMessage) => void>>(new Map());

  useEffect(() => {
    // Подключение при монтировании
    wsService.connect().catch(error => {
      setState(prev => ({ ...prev, error: error.message }));
    });

    // Подписка на события подключения
    const unsubscribeConnection = wsService.subscribe('connection', (message) => {
      setState(prev => ({
        ...prev,
        isConnected: message.data.connected,
        error: message.data.connected ? null : prev.error
      }));
    });

    // Подписка на все сообщения
    const unsubscribeAll = wsService.subscribe('*', (message) => {
      setState(prev => ({ ...prev, lastMessage: message }));
    });

    // Подписка на ошибки
    const unsubscribeErrors = wsService.subscribe('error', (message) => {
      setState(prev => ({ ...prev, error: message.data.error }));
    });

    return () => {
      unsubscribeConnection();
      unsubscribeAll();
      unsubscribeErrors();
      wsService.disconnect();
    };
  }, []);

  const subscribe = useCallback((eventType: string, handler: (message: WebSocketMessage) => void) => {
    return wsService.subscribe(eventType, handler);
  }, []);

  const send = useCallback((message: any) => {
    wsService.send(message);
  }, []);

  return {
    ...state,
    subscribe,
    send,
    connect: () => wsService.connect(),
    disconnect: () => wsService.disconnect()
  };
}

// Специализированные хуки для различных типов данных

// Хук для получения обновлений цен
export function usePriceUpdates() {
  const [prices, setPrices] = useState<Record<string, { price: string; change: string }>>({});
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('price_update', (message) => {
      const { symbol, price, change } = message.data;
      setPrices(prev => ({
        ...prev,
        [symbol]: { price, change }
      }));
    });

    return unsubscribe;
  }, [subscribe]);

  return prices;
}

// Хук для получения обновлений статуса бота
export function useBotStatusUpdates() {
  const [botStatus, setBotStatus] = useState<any>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('bot_status', (message) => {
      setBotStatus(message.data);
    });

    return unsubscribe;
  }, [subscribe]);

  return botStatus;
}

// Хук для получения уведомлений о сделках
export function useTradeUpdates() {
  const [trades, setTrades] = useState<any[]>([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('trade_executed', (message) => {
      setTrades(prev => [message.data, ...prev.slice(0, 99)]); // Храним последние 100 сделок
    });

    return unsubscribe;
  }, [subscribe]);

  return trades;
}

// Хук для получения обновлений ордеров
export function useOrderUpdates() {
  const [orderUpdates, setOrderUpdates] = useState<any[]>([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('order_update', (message) => {
      setOrderUpdates(prev => [message.data, ...prev.slice(0, 49)]); // Храним последние 50 обновлений
    });

    return unsubscribe;
  }, [subscribe]);

  return orderUpdates;
}

// Хук для уведомлений
export function useNotificationUpdates() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('notification', (message) => {
      setNotifications(prev => [message.data, ...prev]);
    });

    return unsubscribe;
  }, [subscribe]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotifications };
}

/*
===========================================
📋 QUICK START INSTRUCTIONS
===========================================

1. СОЗДАНИЕ ПРОЕКТА:
```bash
npx create-react-app trading-bot-dashboard --template typescript
cd trading-bot-dashboard
```

2. УСТАНОВКА ЗАВИСИМОСТЕЙ:
```bash
npm install lucide-react recharts
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npx tailwindcss init -p
```

3. НАСТРОЙКА ФАЙЛОВ:

📄 src/index.css:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #111827;
  color: white;
}
```

📄 .env:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8001/ws
```

📄 src/App.tsx:
```typescript
import React from 'react';
import TradingBotApp from './TradingBotApp';

function App() {
  return <TradingBotApp />;
}

export default App;
```

4. СОЗДАНИЕ КОМПОНЕНТОВ:

Создайте папку src/components/ и скопируйте туда все компоненты:
- TradingBotUI.tsx
- TradingAnalytics.tsx
- PortfolioManagement.tsx
- StrategyBuilder.tsx
- TradingLogs.tsx
- Notifications.tsx
- BotSettings.tsx

5. СОЗДАНИЕ СЕРВИСОВ:

📁 src/services/
- api.ts (этот файл)
- websocket.ts (текущий файл)

6. ЗАПУСК:
```bash
npm start
```

===========================================
🔗 FASTAPI REQUIREMENTS
===========================================

Ваш FastAPI должен предоставлять endpoints:

🤖 Bot Management:
- GET /api/bot/status
- POST /api/bot/start
- POST /api/bot/stop
- POST /api/bot/toggle

📊 Trading:
- GET /api/symbols
- POST /api/symbols/{symbol}/toggle
- GET /api/orders
- DELETE /api/orders/{id}/cancel

💰 Account:
- GET /api/account/balance
- GET /api/account/portfolio

📈 Analytics:
- GET /api/stats
- GET /api/trading/history

⚙️ Settings:
- GET /api/settings
- PUT /api/settings

🔔 Notifications:
- GET /api/notifications
- POST /api/notifications/{id}/read

🌐 WebSocket (/ws):
- bot_status updates
- price_update events
- trade_executed events
- order_update events
- notification events

===========================================
📦 DEPLOYMENT
===========================================

Development:
```bash
npm start
```

Production Build:
```bash
npm run build
# Файлы в build/ готовы для деплоя
```

Docker:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

===========================================
🎯 ГОТОВО!
===========================================

После выполнения всех шагов у вас будет:
✅ Полнофункциональная React панель
✅ Real-time обновления через WebSocket
✅ Подключение к FastAPI backend
✅ Современный дизайн
✅ Все компоненты для управления ботом

Запустите npm start и наслаждайтесь! 🚀
*/