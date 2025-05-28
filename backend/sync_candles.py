import os
import json
import requests
import redis

symbol = "BTCUSDT"
interval = "1m"
limit = 100  # сколько свечей загрузить

BINANCE_ENDPOINT = "https://api.binance.com/api/v3/klines"
REDIS_KEY = f"candles:{symbol}:{interval}"

# Подключение к Redis
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

def fetch_candles():
    params = {
        "symbol": symbol,
        "interval": interval,
        "limit": limit
    }
    res = requests.get(BINANCE_ENDPOINT, params=params)
    res.raise_for_status()
    data = res.json()
    candles = [
        [c[0], c[1], c[2], c[3], c[4]] for c in data
    ]
    return candles

def save_to_redis(candles):
    r.set(REDIS_KEY, json.dumps(candles))
    print(f"✅ Сохранено {len(candles)} свечей в Redis под ключем {REDIS_KEY}")

if __name__ == "__main__":
    candles = fetch_candles()
    save_to_redis(candles)
