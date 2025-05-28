import asyncio
import aiohttp
import redis.asyncio as redis
import json
import time

SYMBOL = "BTCUSDT"
INTERVAL = "1m"
LIMIT = 100
REDIS_KEY = f"candles:{SYMBOL}:{INTERVAL}"

r = redis.Redis(host="redis", port=6379, decode_responses=True)

async def fetch_candles():
    url = f"https://api.binance.com/api/v3/klines?symbol={SYMBOL}&interval={INTERVAL}&limit={LIMIT}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as res:
            data = await res.json()
            candles = [[c[0], c[1], c[2], c[3], c[4]] for c in data]
            await r.set(REDIS_KEY, json.dumps(candles))
            print(f"[✓] Updated {len(candles)} candles at {time.strftime('%H:%M:%S')}")

async def worker():
    while True:
        try:
            await fetch_candles()
        except Exception as e:
            print(f"[!] Error: {e}")
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(worker())
