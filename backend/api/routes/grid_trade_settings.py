from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List
from redis_client import redis

router = APIRouter()

class OrderSide(BaseModel):
    price: str
    quantity: str

class GridLevelSetting(BaseModel):
    buy: OrderSide
    sell: OrderSide

class GridTradeSettingsRequest(BaseModel):
    symbol: str
    levels: List[GridLevelSetting]


@router.post("/grid-trade-settings")
async def save_grid_trade_settings(request: GridTradeSettingsRequest):
    try:
        key = f"grid:settings:{request.symbol.upper()}"
        await redis.set(key, request.model_dump_json())
        return {"message": "Settings saved", "levels": len(request.levels)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grid-trade-settings")
async def get_grid_trade_settings(symbol: str = Query(...)):
    key = f"grid:settings:{symbol.upper()}"
    data = await redis.get(key)
    if not data:
        return {"symbol": symbol.upper(), "gridTradeSettings": []}
    try:
        obj = GridTradeSettingsRequest.model_validate_json(data)
        return {"symbol": obj.symbol, "gridTradeSettings": obj.levels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
