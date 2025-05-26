from fastapi import APIRouter
from binance.client import Client
import os

router = APIRouter()

client = Client(api_key=os.getenv("BINANCE_API_KEY"), api_secret=os.getenv("BINANCE_API_SECRET"))

@router.get("/price")
async def get_price(symbol: str = "BTCUSDT"):
    ticker = client.get_symbol_ticker(symbol=symbol)
    return {
        "symbol": ticker["symbol"],
        "price": ticker["price"]
    }
