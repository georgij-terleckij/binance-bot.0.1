from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
import json
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

@router.post("/grid-trade")
def set_grid_trade(request: GridTradeRequest):
    try:
        save_grid(request.symbol, [level.dict() for level in request.levels])
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
        return {"symbol": symbol.upper(), "gridTrade": default_grid}

    return {"symbol": symbol.upper(), "gridTrade": json.loads(data)}

@router.post("/grid-trade/start")
def start_grid_trade(symbol: str = Query(...)):
    settings_key = f"grid:settings:{symbol.upper()}"
    data = redis_client.get(settings_key)
    if not data:
        raise HTTPException(status_code=404, detail="Grid settings not found")
    set_live_grid(symbol, json.loads(data))
    set_monitoring(symbol, "1")
    return {"message": f"{symbol.upper()} grid started"}

@router.post("/grid-trade/stop")
def stop_grid_trade(symbol: str = Query(...)):
    delete_live_grid(symbol)
    set_monitoring(symbol, "0")
    return {"message": f"{symbol.upper()} grid stopped"}
