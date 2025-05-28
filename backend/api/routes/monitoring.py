from fastapi import APIRouter, HTTPException
from redis import Redis

router = APIRouter()
redis = Redis(host="redis", port=6379, decode_responses=True)

MONITORING_KEY = "monitoring-symbols"

@router.get("/monitoring")
def get_monitored_symbols():
    data = redis.get(MONITORING_KEY)
    return {"symbols": [] if data is None else eval(data)}

@router.post("/monitoring")
def update_monitored_symbols(symbol: str, active: bool):
    data = redis.get(MONITORING_KEY)
    current = set(eval(data)) if data else set()

    if active:
        current.add(symbol.upper())
    else:
        current.discard(symbol.upper())

    redis.set(MONITORING_KEY, str(list(current)))
    return {"success": True, "symbols": list(current)}
