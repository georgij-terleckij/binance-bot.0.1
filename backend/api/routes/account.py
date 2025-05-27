from fastapi import APIRouter
from binance.client import Client
import os

router = APIRouter()

client = Client(
    api_key=os.getenv("BINANCE_API_KEY"),
    api_secret=os.getenv("BINANCE_API_SECRET")
)

@router.get("/account-info")
async def get_account_info():
    account = client.get_account()
    balances = [
        {
            "asset": b["asset"],
            "free": b["free"],
            "locked": b["locked"]
        }
        for b in account["balances"] if float(b["free"]) > 0 or float(b["locked"]) > 0
    ]
    return {
        "account": {
            "makerCommission": account["makerCommission"],
            "takerCommission": account["takerCommission"],
            "canTrade": account["canTrade"],
            "canWithdraw": account["canWithdraw"],
            "canDeposit": account["canDeposit"]
        },
        "balances": balances
    }
