from fastapi import APIRouter, Query
from redis_client import redis_client
import json

router = APIRouter()

@router.get("/logs")
def get_logs(symbol: str = Query(...)):
    key = f"logs:{symbol.upper()}"
    raw = redis_client.lrange(key, -100, -1)  # последние 100 записей

    if not raw:
        return {"symbol": symbol.upper(), "logs": []}

    logs = [json.loads(item) for item in raw]
    return {"symbol": symbol.upper(), "logs": logs}
