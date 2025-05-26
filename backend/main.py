from fastapi import FastAPI
from telegram.bot import start_bot
from api.routes import price

app = FastAPI()
app.include_router(price.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Binance bot API online 🟢"}

@app.on_event("startup")
async def startup_event():
    import asyncio
    asyncio.create_task(start_bot())
