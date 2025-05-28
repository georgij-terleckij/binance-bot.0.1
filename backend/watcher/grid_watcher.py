import asyncio
from binance.client import Client
from redis.asyncio import Redis
import os, json
from redis_client import get_grid, save_grid

client = Client(
    api_key=os.getenv("BINANCE_API_KEY"),
    api_secret=os.getenv("BINANCE_API_SECRET")
)

redis = Redis(host="redis", port=6379, decode_responses=True)
MONITORING_KEY = "monitoring-symbols"

async def check_price(symbol: str):
    try:
        ticker = client.get_symbol_ticker(symbol=symbol)
        return float(ticker["price"])
    except:
        return None

async def watch_symbol(symbol: str):
    print(f"[GridWatcher] 🟢 Следим за {symbol}")
    while True:
        try:
            price = await check_price(symbol)
            if price is None:
                await asyncio.sleep(5)
                continue

            levels = get_grid(symbol)
            updated = False

            for level in levels:
                if not level["triggered"]:
                    buy = float(level["buy"]["price"])
                    sell = float(level["sell"]["price"])

                    if price <= buy:
                        print(f"💥 BUY triggered at {buy} (now: {price})")
                        level["triggered"] = True
                        level["status"] = "buy-triggered"
                        updated = True

                    elif price >= sell:
                        print(f"💥 SELL triggered at {sell} (now: {price})")
                        level["triggered"] = True
                        level["status"] = "sell-triggered"
                        updated = True

            if updated:
                save_grid(symbol, levels)

        except Exception as e:
            print(f"[{symbol}] ❌ Ошибка: {e}")

        await asyncio.sleep(10)

async def main():
    tasks = {}

    while True:
        try:
            raw = await redis.get(MONITORING_KEY)
            symbols = json.loads(raw) if raw else []

            # Запускаем новые
            for s in symbols:
                if s not in tasks:
                    tasks[s] = asyncio.create_task(watch_symbol(s))

            # Останавливаем выключенные
            for s in list(tasks):
                if s not in symbols:
                    tasks[s].cancel()
                    del tasks[s]
                    print(f"[GridWatcher] 🛑 Остановили {s}")

        except Exception as e:
            print(f"[GridWatcher] ❌ Ошибка цикла: {e}")

        await asyncio.sleep(15)  # Период проверки обновлённого списка

if __name__ == "__main__":
    asyncio.run(main())
