from fastapi import APIRouter, Query
from redis import Redis
import json

router = APIRouter()
redis = Redis(host="redis", port=6379, decode_responses=True)

@router.get("/candles")
def get_candles(symbol: str = Query(...), interval: str = Query("1m")):
    key = f"candles:{symbol}:{interval}"
    try:
        raw_data = redis.zrange(key, 0, -1)
        candles = [json.loads(item) for item in raw_data]
        return candles
    except Exception as e:
        return {"error": f"Failed to load candles: {str(e)}"}
