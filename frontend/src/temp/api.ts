// src/services/api.ts
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Типы данных
export interface BotStatus {
  isRunning: boolean;
  totalProfit: number;
  totalTrades: number;
  winRate: number;
  lastUpdate: string;
}

export interface Symbol {
  symbol: string;
  price: string;
  change: string;
  volume: string;
  status: 'active' | 'inactive';
  profit: string;
  trades: number;
}

export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  amount: string;
  price: string;
  status: string;
  time: string;
}

export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Главный класс API сервиса
class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  // Установка токена аутентификации
  setAuthToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // Удаление токена
  removeAuthToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Базовый метод для HTTP запросов
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const config: RequestInit = {
        ...options,
        headers,
      };

      console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data);
        return {
          success: false,
          error: data.detail || data.message || `HTTP ${response.status}`
        };
      }

      console.log(`✅ API Success: ${endpoint}`, data);
      return {
        success: true,
        data: data.data || data,
        message: data.message
      };
    } catch (error) {
      console.error(`💥 API Exception: ${endpoint}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // ===================
  // BOT MANAGEMENT
  // ===================

  async getBotStatus(): Promise<ApiResponse<BotStatus>> {
    return this.request<BotStatus>('/api/bot/status');
  }

  async startBot(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/bot/start', { method: 'POST' });
  }

  async stopBot(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/bot/stop', { method: 'POST' });
  }

  async toggleBot(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/bot/toggle', { method: 'POST' });
  }

  async restartBot(): Promise<ApiResponse<{ message: string }>> {
    return this.request('/api/bot/restart', { method: 'POST' });
  }

  // ===================
  // SYMBOLS & TRADING
  // ===================

  async getSymbols(): Promise<ApiResponse<Symbol[]>> {
    return this.request<Symbol[]>('/api/symbols');
  }

  async getSymbolPrice(symbol: string): Promise<ApiResponse<{ price: string; change: string }>> {
    return this.request<{ price: string; change: string }>(`/api/symbols/${symbol}/price`);
  }

  async toggleSymbol(symbol: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/symbols/${symbol}/toggle`, { method: 'POST' });
  }

  async startSymbolTrading(symbol: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/symbols/${symbol}/start`, { method: 'POST' });
  }

  async stopSymbolTrading(symbol: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/symbols/${symbol}/stop`, { method: 'POST' });
  }

  // ===================
  // ORDERS MANAGEMENT
  // ===================

  async getOrders(params?: {
    symbol?: string;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<Order[]>> {
    const queryParams = new URLSearchParams();

    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    const endpoint = `/api/orders${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<Order[]>(endpoint);
  }

  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/api/orders/${orderId}`);
  }

  async cancelOrder(orderId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/api/orders/${orderId}/cancel`, { method: 'DELETE' });
  }

  async cancelAllOrders(symbol?: string): Promise<ApiResponse<{ message: string }>> {
    const endpoint = symbol ? `/api/orders/cancel-all?symbol=${symbol}` : '/api/orders/cancel-all';
    return this.request(endpoint, { method: 'DELETE' });
  }

  // ===================
  // BALANCE & ACCOUNT
  // ===================

  async getBalance(): Promise<ApiResponse<Balance[]>> {
    return this.request<Balance[]>('/api/account/balance');
  }

  async getAccountInfo(): Promise<ApiResponse<any>> {
    return this.request('/api/account/info');
  }

  async getPortfolioSummary(): Promise<ApiResponse<any>> {
    return this.request('/api/account/portfolio');
  }

  // ===================
  // STATISTICS & ANALYTICS
  // ===================

  async getStats(period: 'day' | 'week' | 'month' = 'day'): Promise<ApiResponse<any>> {
    return this.request(`/api/stats?period=${period}`);
  }

  async getProfitLoss(period: 'day' | 'week' | 'month' = 'day'): Promise<ApiResponse<any>> {
    return this.request(`/api/stats/pnl?period=${period}`);
  }

  async getTradingHistory(params?: {
    symbol?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();

    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const endpoint = `/api/trading/history${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  // ===================
  // GRID TRADING
  // ===================

  async getGridStatus(symbol: string): Promise<ApiResponse<any>> {
    return this.request(`/api/grid-trade/status?symbol=${symbol}`);
  }

  async getGrid(symbol: string): Promise<ApiResponse<any>> {
    return this.request(`/api/grid-trade?symbol=${symbol}`);
  }

  async createGrid(symbol: string, config: any): Promise<ApiResponse<any>> {
    return this.request('/api/grid-trade', {
      method: 'POST',
      body: JSON.stringify({ symbol, config })
    });
  }

  async startGrid(symbol: string): Promise<ApiResponse<any>> {
    return this.request(`/api/grid-trade/start?symbol=${symbol}`, { method: 'POST' });
  }

  async stopGrid(symbol: string): Promise<ApiResponse<any>> {
    return this.request(`/api/grid-trade/stop?symbol=${symbol}`, { method: 'POST' });
  }

  async deleteGrid(symbol: string): Promise<ApiResponse<any>> {
    return this.request(`/api/grid-trade?symbol=${symbol}`, { method: 'DELETE' });
  }

  // ===================
  // STRATEGIES
  // ===================

  async getStrategies(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/strategies');
  }

  async getStrategy(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/strategies/${id}`);
  }

  async createStrategy(strategy: any): Promise<ApiResponse<any>> {
    return this.request('/api/strategies', {
      method: 'POST',
      body: JSON.stringify(strategy)
    });
  }

  async updateStrategy(id: string, strategy: any): Promise<ApiResponse<any>> {
    return this.request(`/api/strategies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(strategy)
    });
  }

  async deleteStrategy(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/strategies/${id}`, { method: 'DELETE' });
  }

  async toggleStrategy(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/strategies/${id}/toggle`, { method: 'POST' });
  }

  // ===================
  // SETTINGS
  // ===================

  async getSettings(): Promise<ApiResponse<any>> {
    return this.request('/api/settings');
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  async resetSettings(): Promise<ApiResponse<any>> {
    return this.request('/api/settings/reset', { method: 'POST' });
  }

  // ===================
  // NOTIFICATIONS
  // ===================

  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/notifications');
  }

  async markNotificationRead(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/notifications/${id}/read`, { method: 'POST' });
  }

  async deleteNotification(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/notifications/${id}`, { method: 'DELETE' });
  }

  async clearAllNotifications(): Promise<ApiResponse<any>> {
    return this.request('/api/notifications/clear', { method: 'DELETE' });
  }

  // ===================
  // HEALTH & UTILS
  // ===================

  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  async testConnection(): Promise<ApiResponse<any>> {
    return this.request('/api/test-connection');
  }

  // WebSocket URL
  getWebSocketUrl(): string {
    const wsProtocol = this.baseURL.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = this.baseURL.replace(/^https?/, wsProtocol);
    return `${wsUrl}/ws`;
  }
}

// Singleton instance
const apiService = new ApiService();
export default apiService;

// ===================
// REACT HOOKS
// ===================

// Базовый хук для API вызовов
export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<ApiResponse<T>>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiCall();

      if (response.success && response.data) {
        setData(response.data);
        return response.data;
      } else {
        setError(response.error || 'Unknown error');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

// Хук для статуса бота
export function useBotStatus() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getBotStatus();

      if (response.success && response.data) {
        setStatus(response.data);
      } else {
        setError(response.error || 'Failed to fetch bot status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleBot = useCallback(async () => {
    try {
      const response = await apiService.toggleBot();
      if (response.success) {
        await fetchStatus(); // Обновляем статус после переключения
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchStatus]);

  // Автоматическое обновление каждые 30 секунд
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, loading, error, fetchStatus, toggleBot };
}

// Хук для символов
export function useSymbols() {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSymbols = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getSymbols();

      if (response.success && response.data) {
        setSymbols(response.data);
      } else {
        setError(response.error || 'Failed to fetch symbols');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSymbol = useCallback(async (symbol: string) => {
    try {
      const response = await apiService.toggleSymbol(symbol);
      if (response.success) {
        await fetchSymbols(); // Обновляем список после переключения
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchSymbols]);

  useEffect(() => {
    fetchSymbols();
  }, [fetchSymbols]);

  return { symbols, loading, error, fetchSymbols, toggleSymbol };
}

// Хук для ордеров
export function useOrders(symbol?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getOrders({ symbol, limit: 100 });

      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError(response.error || 'Failed to fetch orders');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const cancelOrder = useCallback(async (orderId: string) => {
    try {
      const response = await apiService.cancelOrder(orderId);
      if (response.success) {
        await fetchOrders(); // Обновляем список после отмены
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, loading, error, fetchOrders, cancelOrder };
}

// Хук для баланса
export function useBalance() {
  const [balance, setBalance] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getBalance();

      if (response.success && response.data) {
        setBalance(response.data);
      } else {
        setError(response.error || 'Failed to fetch balance');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, error, fetchBalance };
}

// Хук для уведомлений
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getNotifications();

      if (response.success && response.data) {
        setNotifications(response.data);
      } else {
        setError(response.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await apiService.markNotificationRead(id);
      if (response.success) {
        await fetchNotifications();
      }
      return response;
    } catch (err) {
      throw err;
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, loading, error, fetchNotifications, markAsRead };
}

// Экспорт всех хуков
export { apiService };