from fastapi import APIRouter, Query
from redis_client import redis_client
import json

router = APIRouter()

@router.post("/archive")
async def get_archive(
    symbol: str = Query(...),
    page: int = Query(1),
    limit: int = Query(50)
):
    key = f"archive:{symbol.upper()}"
    start = (page - 1) * limit
    end = start + limit - 1
    raw = await redis_client.lrange(key, start, end)  # список JSON-строк

    rows = [json.loads(item) for item in raw] if raw else []

    # Здесь можно сделать простую агрегацию по прибыли и т.п. вручную
    profit = sum(item.get('profit', 0) for item in rows)
    trades = len(rows)
    profitPercentage = (
        (profit / sum(item.get('totalBuyQuoteQty', 1) for item in rows)) * 100
        if rows else 0
    )

    return {
        "success": True,
        "status": 200,
        "message": "OK",
        "data": {
            "rows": rows,
            "stats": {
                "profit": profit,
                "profitPercentage": profitPercentage,
                "trades": trades
            }
        }
    }
