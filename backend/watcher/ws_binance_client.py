import asyncio
import json
import websockets
from redis.asyncio import Redis
import logging

BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@kline_1m"
REDIS_URL = "redis://redis:6379"
REDIS_KEY = "candles:BTCUSDT:1m"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def save_candle_to_redis(redis, candle_data):
    kline = candle_data['k']
    candle = {
        't': kline['t'],
        'o': kline['o'],
        'h': kline['h'],
        'l': kline['l'],
        'c': kline['c'],
        'v': kline['v'],
        'T': kline['T'],
        'x': kline['x'],
    }

    key = REDIS_KEY
    score = kline['t']

    key_type = await redis.type(key)
    if key_type != 'zset' and key_type != 'none':
        await redis.delete(key)

    await redis.zadd(key, {json.dumps(candle): score})
    await redis.zremrangebyrank(key, 0, -1001)

    logger.info(f"Updated candle: {candle['t']} (final: {candle['x']})")



async def listen_to_binance():
    redis = Redis.from_url(REDIS_URL, decode_responses=True)
    async with websockets.connect(BINANCE_WS_URL) as ws:
        logger.info("Connected to Binance WebSocket")

        async for message in ws:
            data = json.loads(message)
            if data.get("e") == "kline":
                await save_candle_to_redis(redis, data)

if __name__ == "__main__":
    asyncio.run(listen_to_binance())
