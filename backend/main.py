from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from telegram.bot import start_bot
from watcher.grid_watcher import main

from api.routes import price
from api.routes import account
from api.routes import orders
from api.routes import grid_trade
from api.routes import grid_trade_settings
from api.routes import candles
from api.routes import monitoring
from api.routes import logs
from api.routes import archive

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # или ["http://localhost:5173"] для безопасности
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(grid_trade.router, prefix="/api")
app.include_router(grid_trade_settings.router, prefix="/api")
app.include_router(candles.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")
app.include_router(logs.router, prefix="/api")
app.include_router(archive.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Binance bot API online 🟢"}


@app.on_event("startup")
async def startup_event():
    import asyncio
    asyncio.create_task(start_bot())  # Telegram
    asyncio.create_task(main())  # Grid-слежение
