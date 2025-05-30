# backend/watcher/ws_server.py
import asyncio
import json
import logging
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Глобальные переменные для управления задачами
redis_task = None
redis_client = None


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_count = 0
        self.subscriptions = {}  # {websocket: {"channels": [], "symbols": []}}

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            self.active_connections.append(websocket)
            self.connection_count += 1
            self.subscriptions[websocket] = {"channels": [], "symbols": []}
            logger.info(f"Client connected. Total connections: {len(self.active_connections)}")

            # Отправляем приветственное сообщение
            await websocket.send_text(json.dumps({
                "type": "welcome",
                "message": "Connected to WebSocket server",
                "connection_id": self.connection_count
            }))
        except Exception as e:
            logger.error(f"Error accepting connection: {e}")
            raise

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            if websocket in self.subscriptions:
                del self.subscriptions[websocket]
            logger.info(f"Client disconnected. Total connections: {len(self.active_connections)}")

    def add_subscription(self, websocket: WebSocket, channel: str, symbols: list = None):
        """Добавить подписку клиента на канал и символы"""
        if websocket in self.subscriptions:
            if channel not in self.subscriptions[websocket]["channels"]:
                self.subscriptions[websocket]["channels"].append(channel)

            if symbols:
                for symbol in symbols:
                    if symbol not in self.subscriptions[websocket]["symbols"]:
                        self.subscriptions[websocket]["symbols"].append(symbol.upper())

            logger.info(f"Client subscribed to {channel}, symbols: {symbols}")

    def remove_subscription(self, websocket: WebSocket, channel: str):
        """Удалить подписку клиента"""
        if websocket in self.subscriptions and channel in self.subscriptions[websocket]["channels"]:
            self.subscriptions[websocket]["channels"].remove(channel)
            logger.info(f"Client unsubscribed from {channel}")

    def should_send_to_client(self, websocket: WebSocket, event_data: dict) -> bool:
        """Проверить, должен ли клиент получать это событие"""
        if websocket not in self.subscriptions:
            return True  # Отправляем всем, если нет подписок

        client_subs = self.subscriptions[websocket]
        event_symbol = event_data.get("symbol", "").upper()
        event_type = event_data.get("type", "")

        # Если у клиента нет подписок, отправляем все grid события
        if not client_subs["channels"] and not client_subs["symbols"]:
            return True

        # Если клиент подписан на символы, проверяем символ события
        if client_subs["symbols"] and event_symbol:
            return event_symbol in client_subs["symbols"]

        # Если клиент подписан на каналы grid-trade, отправляем все grid события
        if "grid-trade" in client_subs["channels"]:
            return True

        # Для остальных каналов тоже отправляем (пока не реализована детальная логика)
        if client_subs["channels"]:
            return True

        return True  # По умолчанию отправляем

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: str):
        if not self.active_connections:
            logger.debug("No active connections to broadcast to")
            return

        try:
            event_data = json.loads(message)
        except json.JSONDecodeError:
            event_data = {"type": "unknown", "symbol": ""}

        logger.info(f"Broadcasting {event_data.get('type', 'unknown')} event to clients")
        disconnected = []
        sent_count = 0

        for connection in self.active_connections.copy():
            try:
                # Проверяем, нужно ли отправлять событие этому клиенту
                if self.should_send_to_client(connection, event_data):
                    await connection.send_text(message)
                    sent_count += 1
                else:
                    logger.debug(f"Skipping client - not subscribed to {event_data.get('symbol', 'N/A')}")
            except Exception as e:
                logger.warning(f"Error broadcasting to connection: {e}")
                disconnected.append(connection)

        logger.info(f"Message sent to {sent_count}/{len(self.active_connections)} clients")

        # Удаляем отключенные соединения
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


async def init_redis():
    """Инициализация Redis с обработкой ошибок"""
    global redis_client
    try:
        redis_client = Redis(
            host="redis",
            port=6379,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )

        # Проверяем подключение
        await redis_client.ping()
        logger.info("Successfully connected to Redis")
        return redis_client
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Server will work without Redis.")
        return None


async def redis_listener():
    """Слушает Redis и рассылает сообщения всем подключенным клиентам"""
    global redis_client

    if not redis_client:
        logger.info("Redis not available, skipping Redis listener")
        return

    try:
        pubsub = redis_client.pubsub()
        # Подписываемся на канал events (тот же что использует ваш API)
        await pubsub.subscribe("events")
        logger.info("Redis listener started, subscribed to 'events' channel")

        async for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    # Парсим событие из Redis
                    event_data = json.loads(message['data'])
                    event_type = event_data.get('type', 'unknown')

                    logger.info(f"Received Redis event: {event_type} for {event_data.get('symbol', 'N/A')}")

                    # Обрабатываем разные типы событий
                    formatted_event = await format_event_for_clients(event_data)

                    if formatted_event:
                        await manager.broadcast(json.dumps(formatted_event))
                    else:
                        logger.warning(f"Event {event_type} was not formatted for clients")

                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing Redis message: {e}")
                    # Отправляем как есть, если не можем распарсить
                    await manager.broadcast(message['data'])
                except Exception as e:
                    logger.error(f"Error processing Redis event: {e}")

    except asyncio.CancelledError:
        logger.info("Redis listener cancelled")
        raise
    except Exception as e:
        logger.error(f"Redis listener error: {e}")
        # Ждем перед повторной попыткой
        await asyncio.sleep(5)


async def format_event_for_clients(event_data: dict) -> dict:
    """Форматирует события для отправки клиентам"""
    event_type = event_data.get('type', 'unknown')
    symbol = event_data.get('symbol', '')
    timestamp = event_data.get('timestamp', '')
    data = event_data.get('data', {})

    # Базовый формат для всех событий
    formatted = {
        "type": event_type,
        "symbol": symbol,
        "timestamp": timestamp,
        "server_time": asyncio.get_event_loop().time()
    }

    # Специальное форматирование для разных типов событий
    if event_type == 'grid-started':
        formatted.update({
            "message": f"Grid trading started for {symbol}",
            "status": "active",
            "levels_count": data.get('levels_count', 0),
            "monitoring": data.get('monitoring', True)
        })

    elif event_type == 'grid-stopped':
        formatted.update({
            "message": f"Grid trading stopped for {symbol}",
            "status": "inactive",
            "monitoring": data.get('monitoring', False)
        })

    elif event_type == 'grid-settings-updated':
        formatted.update({
            "message": f"Grid settings updated for {symbol}",
            "levels_count": data.get('levels_count', 0),
            "levels": data.get('levels', [])
        })

    elif event_type == 'grid-level-triggered':
        formatted.update({
            "message": f"Grid level triggered for {symbol}",
            "level_index": data.get('level_index'),
            "side": data.get('side'),
            "trigger_status": data.get('status', 'triggered')
        })

    elif event_type == 'grid-default-created':
        formatted.update({
            "message": f"Default grid created for {symbol}",
            "levels": data.get('levels', [])
        })

    elif event_type == 'grid-status-requested':
        formatted.update({
            "message": f"Grid status for {symbol}",
            "is_active": data.get('is_active', False),
            "has_live_grid": data.get('has_live_grid', False),
            "grid_data": data.get('grid_data')
        })

    elif event_type == 'test-event':
        formatted.update({
            "message": data.get('message', 'Test event'),
            "test": True
        })

    else:
        # Для неизвестных событий отправляем как есть
        formatted.update({
            "message": f"Unknown event: {event_type}",
            "raw_data": data
        })

    return formatted


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global redis_task, redis_client

    logger.info("Starting WebSocket server...")

    # Инициализируем Redis
    redis_client = await init_redis()

    # Запускаем Redis listener только если Redis доступен
    if redis_client:
        redis_task = asyncio.create_task(redis_listener())
        logger.info("Redis listener task started")
    else:
        logger.info("Server started without Redis")

    yield

    # Shutdown
    logger.info("Shutting down WebSocket server...")

    if redis_task:
        redis_task.cancel()
        try:
            await redis_task
        except asyncio.CancelledError:
            logger.info("Redis listener task cancelled")

    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


app = FastAPI(
    title="WebSocket Server",
    description="WebSocket server with Redis integration",
    version="1.0.0",
    lifespan=lifespan
)

# Добавляем CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            try:
                # Ждем сообщение с таймаутом
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)

                try:
                    # Пытаемся парсить как JSON
                    message = json.loads(data)
                    await handle_message(message, websocket)
                except json.JSONDecodeError:
                    # Если не JSON, отправляем эхо
                    logger.info(f"Received text message: {data}")
                    await manager.send_personal_message(f"Echo: {data}", websocket)

            except asyncio.TimeoutError:
                # Отправляем ping для поддержания соединения
                try:
                    await websocket.send_text(
                        json.dumps({"type": "ping", "timestamp": asyncio.get_event_loop().time()}))
                    logger.debug("Sent ping to client")
                except Exception as e:
                    logger.error(f"Error sending ping: {e}")
                    break

    except WebSocketDisconnect:
        logger.info("Client disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)


async def handle_message(message: dict, websocket: WebSocket):
    """Обработка JSON сообщений от клиента"""
    message_type = message.get('type', 'unknown')

    logger.info(f"Handling message type: {message_type}")

    if message_type == 'ping':
        await manager.send_personal_message(json.dumps({
            "type": "pong",
            "timestamp": asyncio.get_event_loop().time()
        }), websocket)

    elif message_type == 'pong':
        logger.debug("Received pong from client")

    elif message_type == 'echo':
        await manager.send_personal_message(json.dumps({
            "type": "echo_response",
            "data": message.get('data', ''),
            "timestamp": asyncio.get_event_loop().time()
        }), websocket)

    elif message_type == 'broadcast_test':
        # Тестовый broadcast для всех клиентов
        test_message = json.dumps({
            "type": "test_broadcast",
            "message": message.get('message', 'Test broadcast'),
            "timestamp": asyncio.get_event_loop().time()
        })
        await manager.broadcast(test_message)

    elif message_type == 'subscribe':
        # Подписка на определенные данные/символы
        channel = message.get('channel', 'default')
        symbols = message.get('symbols', [])  # Список символов для подписки

        # Сохраняем подписки клиента
        manager.add_subscription(websocket, channel, symbols)

        await manager.send_personal_message(json.dumps({
            "type": "subscription_result",
            "channel": channel,
            "symbols": symbols,
            "result": True,
            "message": f"Subscribed to {channel} for symbols: {symbols}"
        }), websocket)

    elif message_type == 'unsubscribe':
        # Отписка от данных
        channel = message.get('channel', 'default')
        manager.remove_subscription(websocket, channel)

        await manager.send_personal_message(json.dumps({
            "type": "unsubscription_result",
            "channel": channel,
            "result": True,
            "message": f"Unsubscribed from {channel}"
        }), websocket)

    else:
        # Отправляем обратно неизвестное сообщение
        await manager.send_personal_message(json.dumps({
            "type": "unknown_message",
            "original": message,
            "timestamp": asyncio.get_event_loop().time()
        }), websocket)


@app.get("/")
async def root():
    return {
        "message": "WebSocket Server is running",
        "websocket_url": "ws://localhost:8001/ws",
        "active_connections": len(manager.active_connections),
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    redis_status = "unknown"

    if redis_client:
        try:
            await redis_client.ping()
            redis_status = "connected"
        except Exception:
            redis_status = "disconnected"
    else:
        redis_status = "not_configured"

    return {
        "status": "healthy",
        "active_connections": len(manager.active_connections),
        "redis_status": redis_status,
        "total_connections": manager.connection_count
    }


@app.post("/broadcast")
async def broadcast_message(message: dict):
    """Эндпоинт для отправки broadcast сообщений"""
    broadcast_data = json.dumps({
        "type": "api_broadcast",
        "data": message,
        "timestamp": asyncio.get_event_loop().time()
    })

    await manager.broadcast(broadcast_data)

    return {
        "status": "success",
        "message": "Message broadcasted",
        "active_connections": len(manager.active_connections)
    }


@app.get("/subscriptions")
async def get_subscriptions():
    """Получить информацию о текущих подписках"""
    subs_info = {}
    for ws, subs in manager.subscriptions.items():
        # Используем id WebSocket как ключ (не очень красиво, но для отладки подойдет)
        subs_info[f"connection_{id(ws)}"] = subs

    return {
        "active_connections": len(manager.active_connections),
        "subscriptions": subs_info
    }


@app.post("/test-grid-event")
async def test_grid_event(
        event_type: str = "grid-started",
        symbol: str = "BTCUSDT"
):
    """Тестовый эндпоинт для отправки grid событий"""
    if not redis_client:
        return {"error": "Redis not available"}

    test_events = {
        "grid-started": {
            "levels_count": 5,
            "monitoring": True
        },
        "grid-stopped": {
            "monitoring": False
        },
        "grid-level-triggered": {
            "level_index": 1,
            "side": "buy",
            "status": "triggered"
        }
    }

    event_data = {
        "type": event_type,
        "symbol": symbol.upper(),
        "timestamp": asyncio.get_event_loop().time(),
        "data": test_events.get(event_type, {"test": True})
    }

    try:
        result = await redis_client.publish("events", json.dumps(event_data))
        return {
            "status": "success",
            "event_sent": event_data,
            "subscribers_notified": result
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting WebSocket server directly...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )