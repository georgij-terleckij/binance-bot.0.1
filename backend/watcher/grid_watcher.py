import asyncio
import os
import json
from datetime import datetime
from binance.client import Client
from redis.asyncio import Redis
from redis_client import get_grid, save_grid
from telegram.alerts import send_alert

client = Client(
    api_key=os.getenv("BINANCE_API_KEY"),
    api_secret=os.getenv("BINANCE_API_SECRET")
)

REAL_TRADING = os.getenv("REAL_TRADING", "false").lower() == "true"

redis = Redis(host="redis", port=6379, decode_responses=True)
MONITORING_KEY = "monitoring-symbols"

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


async def execute_order(symbol: str, side: str, quantity: float):
    if not REAL_TRADING:
        print(f"[SIMULATION] 💸 {side} {quantity} {symbol}")
        return {"simulated": True, "side": side, "quantity": quantity}

    try:
        print(f"[REAL] 💰 Sending {side} order for {symbol}...")
        order = client.create_order(
            symbol=symbol,
            side=side.upper(),
            type="MARKET",
            quantity=quantity
        )
        print(f"[REAL] ✅ Order filled: {order}")
        return order
    except Exception as e:
        print(f"[REAL] ❌ Order failed: {e}")
        return {"error": str(e)}

async def check_price(symbol: str) -> float | None:
    try:
        ticker = client.get_symbol_ticker(symbol=symbol)
        return float(ticker["price"])
    except:
        return None


async def log_event(symbol: str, event_type: str, price: float):
    log = {
        "type": event_type,
        "price": price,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    await redis.rpush(f"logs:{symbol.upper()}", json.dumps(log))
    await send_alert(f"📉 {symbol} {event_type} @ {price}")


async def watch_symbol(symbol: str):
    print(f"[GridWatcher] 🟢 Следим за {symbol}")
    while True:
        try:
            price = await check_price(symbol)
            if price is None:
                await asyncio.sleep(5)
                continue

            levels = get_grid(symbol, live=True)
            updated = False

            for level in levels:
                if not level.get("triggered", False):
                    buy = float(level["buy"]["price"])
                    sell = float(level["sell"]["price"])
                    quantity = float(level["buy"]["quantity"])  # предполагаем, что одинаково

                    if price <= buy:
                        print(f"💥 BUY triggered at {buy} (now: {price})")
                        level["triggered"] = True
                        level["status"] = "buy-triggered"
                        await log_event(symbol, "BUY", price)
                        await execute_order(symbol, "BUY", quantity)
                        updated = True

                    elif price >= sell:
                        print(f"💥 SELL triggered at {sell} (now: {price})")
                        level["triggered"] = True
                        level["status"] = "sell-triggered"
                        await log_event(symbol, "SELL", price)
                        await execute_order(symbol, "SELL", quantity)
                        updated = True

            if updated:
                save_grid(symbol, levels, live=True)

        except Exception as e:
            print(f"[{symbol}] ❌ Ошибка: {e}")

        await asyncio.sleep(10)


async def main():
    tasks = {}

    while True:
        try:
            raw = await redis.get(MONITORING_KEY)
            symbols = json.loads(raw) if raw else []

            for s in symbols:
                if s not in tasks:
                    tasks[s] = asyncio.create_task(watch_symbol(s))

            for s in list(tasks):
                if s not in symbols:
                    tasks[s].cancel()
                    del tasks[s]
                    print(f"[GridWatcher] 🛑 Остановили {s}")

        except Exception as e:
            print(f"[GridWatcher] ❌ Ошибка цикла: {e}")

        await asyncio.sleep(15)


if __name__ == "__main__":
    asyncio.run(main())
