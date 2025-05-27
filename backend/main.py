from fastapi import FastAPI
from telegram.bot import start_bot
from api.routes import price
from api.routes import account
from api.routes import orders
from api.routes import grid_trade

app = FastAPI()
app.include_router(price.router, prefix="/api")
app.include_router(account.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(grid_trade.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Binance bot API online 🟢"}

@app.on_event("startup")
async def startup_event():
    import asyncio
    asyncio.create_task(start_bot())
