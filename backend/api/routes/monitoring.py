from fastapi import APIRouter, Query
from redis import Redis
import json

router = APIRouter()
redis = Redis(host="redis", port=6379, decode_responses=True)

MONITORING_KEY = "monitoring-symbols"

@router.get("/monitoring")
def get_monitored_symbols():
    data = redis.get(MONITORING_KEY)
    return {"symbols": json.loads(data) if data else []}

@router.post("/monitoring")
def update_monitored_symbols(
    symbol: str = Query(...),
    active: bool = Query(...)
):
    data = redis.get(MONITORING_KEY)
    current = set(json.loads(data)) if data else set()

    symbol = symbol.upper()
    if active:
        current.add(symbol)
    else:
        current.discard(symbol)

    redis.set(MONITORING_KEY, json.dumps(list(current)))
    return {"success": True, "symbols": list(current)}
