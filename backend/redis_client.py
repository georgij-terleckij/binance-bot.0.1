import os
import redis
import json

# Синхронный клиент Redis
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

def save_grid(symbol: str, grid_data: list):
    key = f"grid:settings:{symbol.upper()}"
    redis_client.set(key, json.dumps(grid_data))

def get_grid(symbol: str):
    key = f"grid:settings:{symbol.upper()}"
    data = redis_client.get(key)
    return json.loads(data) if data else []

def set_live_grid(symbol: str, grid_data: list):
    key = f"grid:{symbol.upper()}"
    redis_client.set(key, json.dumps(grid_data))

def delete_live_grid(symbol: str):
    key = f"grid:{symbol.upper()}"
    redis_client.delete(key)

def set_monitoring(symbol: str, value: str):
    key = f"monitoring:{symbol.upper()}"
    redis_client.set(key, value)
