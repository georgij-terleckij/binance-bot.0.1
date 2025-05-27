from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from binance.client import Client
import os

router = APIRouter()

client = Client(
    api_key=os.getenv("BINANCE_API_KEY"),
    api_secret=os.getenv("BINANCE_API_SECRET")
)

class CreateOrderRequest(BaseModel):
    symbol: str = Field(..., example="BTCUSDT")
    side: str = Field(..., example="BUY")  # BUY or SELL
    type: str = Field(..., example="LIMIT")  # LIMIT or MARKET
    quantity: float = Field(..., example=0.001)
    price: float = Field(None, example=66000.0)  # Только для LIMIT
    timeInForce: str = Field(default="GTC", example="GTC")  # Только для LIMIT

@router.get("/open-orders")
async def get_open_orders(symbol: str = Query(..., description="Trading pair like BTCUSDT")):
    try:
        orders = client.get_open_orders(symbol=symbol.upper())
        return {"symbol": symbol.upper(), "open_orders": orders}
    except Exception as e:
        return {"error": str(e)}


@router.post("/order")
async def create_order(order: CreateOrderRequest):
    try:
        params = {
            "symbol": order.symbol.upper(),
            "side": order.side.upper(),
            "type": order.type.upper(),
            "quantity": order.quantity
        }

        # Для лимитного ордера — нужно ещё цена и timeInForce
        if order.type.upper() == "LIMIT":
            params["price"] = str(order.price)
            params["timeInForce"] = order.timeInForce

        response = client.create_order(**params)
        return {"message": "Order created", "order": response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/order")
async def cancel_order(
    symbol: str = Query(..., description="Trading pair like BTCUSDT"),
    orderId: int = Query(..., description="Binance order ID")
):
    try:
        result = client.cancel_order(symbol=symbol.upper(), orderId=orderId)
        return {"message": "Order canceled", "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))