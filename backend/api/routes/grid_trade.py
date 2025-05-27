from fastapi import APIRouter

router = APIRouter()

@router.get("/grid-trade")
async def get_grid_trade(symbol: str = "BTCUSDT"):
    # В будущем: тянуть из Redis/Mongo/DB
    return {
        "symbol": symbol.upper(),
        "gridTrade": [
            {
                "triggered": False,
                "buy": {
                    "price": "65500.00",
                    "quantity": "0.001"
                },
                "sell": {
                    "price": "67500.00",
                    "quantity": "0.001"
                },
                "status": "idle"
            },
            {
                "triggered": False,
                "buy": {
                    "price": "64500.00",
                    "quantity": "0.001"
                },
                "sell": {
                    "price": "66500.00",
                    "quantity": "0.001"
                },
                "status": "idle"
            }
        ]
    }
