from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
import json
import asyncio
from datetime import datetime
from redis_client import (
    redis_client,
    save_grid,
    get_grid,
    set_live_grid,
    delete_live_grid,
    set_monitoring
)

router = APIRouter()


class OrderSide(BaseModel):
    price: str
    quantity: str


class GridLevel(BaseModel):
    triggered: bool
    buy: dict
    sell: dict
    status: str


class GridTradeRequest(BaseModel):
    symbol: str
    levels: List[GridLevel]


import logging

# Добавляем логгер
logger = logging.getLogger(__name__)


async def publish_event(event_type: str, symbol: str, data: dict = None):
    """Публикация события в Redis для WebSocket сервера"""
    try:
        event = {
            "type": event_type,
            "symbol": symbol.upper(),
            "timestamp": datetime.utcnow().isoformat(),
            "data": data or {}
        }

        # Публикуем в канал events (тот же, который слушает WebSocket сервер)
        result = redis_client.publish("events", json.dumps(event))
        logger.info(f"Published event {event_type} for {symbol}, subscribers: {result}")

    except Exception as e:
        logger.error(f"Error publishing event: {e}")


@router.post("/grid-trade")
async def set_grid_trade(request: GridTradeRequest):
    try:
        save_grid(request.symbol, [level.dict() for level in request.levels])

        # Публикуем событие о сохранении грида
        await publish_event(
            event_type="grid-settings-updated",
            symbol=request.symbol,
            data={
                "levels_count": len(request.levels),
                "levels": [level.dict() for level in request.levels]
            }
        )

        return {"message": "Grid saved", "levels": len(request.levels)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid-trade")
async def get_grid_trade(symbol: str = Query(...)):
    key = f"grid:settings:{symbol.upper()}"
    data = redis_client.get(key)

    if not data:
        default_grid = [
            {
                "triggered": False,
                "status": "",
                "buy": {"price": "65000", "quantity": "0.001"},
                "sell": {"price": "67000", "quantity": "0.001"},
            },
            {
                "triggered": False,
                "status": "",
                "buy": {"price": "64000", "quantity": "0.001"},
                "sell": {"price": "66000", "quantity": "0.001"},
            }
        ]
        redis_client.set(key, json.dumps(default_grid))

        # Публикуем событие о создании дефолтного грида
        await publish_event(
            event_type="grid-default-created",
            symbol=symbol,
            data={"levels": default_grid}
        )

        return {"symbol": symbol.upper(), "gridTrade": default_grid}

    return {"symbol": symbol.upper(), "gridTrade": json.loads(data)}


@router.post("/grid-trade/start")
async def start_grid_trade(symbol: str = Query(...)):
    settings_key = f"grid:settings:{symbol.upper()}"
    data = redis_client.get(settings_key)
    if not data:
        raise HTTPException(status_code=404, detail="Grid settings not found")

    grid_data = json.loads(data)
    set_live_grid(symbol, grid_data)
    set_monitoring(symbol, "1")

    # Публикуем событие о запуске грида
    await publish_event(
        event_type="grid-started",
        symbol=symbol,
        data={
            "status": "active",
            "levels_count": len(grid_data),
            "monitoring": True
        }
    )

    return {"message": f"{symbol.upper()} grid started"}


@router.post("/grid-trade/stop")
async def stop_grid_trade(symbol: str = Query(...)):
    delete_live_grid(symbol)
    set_monitoring(symbol, "0")

    # Публикуем событие об остановке грида
    await publish_event(
        event_type="grid-stopped",
        symbol=symbol,
        data={
            "status": "inactive",
            "monitoring": False
        }
    )

    return {"message": f"{symbol.upper()} grid stopped"}


# Дополнительные эндпоинты для управления событиями
@router.post("/grid-trade/trigger")
async def trigger_grid_level(symbol: str = Query(...), level_index: int = Query(...), side: str = Query(...)):
    """Эндпоинт для триггера уровня грида (вызывается воркером или вручную)"""
    try:
        # Здесь должна быть логика обновления статуса уровня
        # Для примера просто публикуем событие
        await publish_event(
            event_type="grid-level-triggered",
            symbol=symbol,
            data={
                "level_index": level_index,
                "side": side,  # "buy" или "sell"
                "status": "triggered"
            }
        )

        return {"message": f"Level {level_index} {side} triggered for {symbol.upper()}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid-trade/status")
async def get_grid_status(symbol: str = Query(...)):
    """Получение текущего статуса грида"""
    try:
        monitoring_status = redis_client.get(f"monitoring:{symbol.upper()}")
        live_grid = redis_client.get(f"grid:live:{symbol.upper()}")
        settings_grid = redis_client.get(f"grid:settings:{symbol.upper()}")

        status = {
            "symbol": symbol.upper(),
            "is_active": monitoring_status == "1",
            "has_live_grid": live_grid is not None,
            "has_settings": settings_grid is not None,
            "live_grid_data": json.loads(live_grid) if live_grid else None,
            "settings_data": json.loads(settings_grid) if settings_grid else None
        }

        # Публикуем событие о запросе статуса (опционально)
        await publish_event(
            event_type="grid-status-requested",
            symbol=symbol,
            data=status
        )

        return status
    except Exception as e:
        logger.error(f"Error getting grid status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Тестовый эндпоинт для проверки WebSocket событий
@router.post("/test-event")
async def send_test_event(message: str = Query("Test message")):
    """Отправка тестового события в WebSocket"""
    await publish_event(
        event_type="test-event",
        symbol="TEST",
        data={"message": message}
    )
    return {"message": "Test event sent"}