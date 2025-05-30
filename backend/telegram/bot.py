import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.client.bot import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.filters import Command

bot = Bot(
    token=os.getenv("TELEGRAM_BOT_TOKEN"),
    default=DefaultBotProperties(parse_mode=ParseMode.HTML)
)

dp = Dispatcher(storage=MemoryStorage())


@dp.message(Command("start"))
async def start_handler(message: types.Message):
    await message.answer("Я бот Binance, готов служить!")


@dp.message(Command("id"))
async def id_handler(message: types.Message):
    await message.answer(f"🆔 Твой chat_id: <code>{message.chat.id}</code>")


@dp.message()
async def echo_handler(message: types.Message):
    await message.answer("Привет, я бот Binance!")


async def start_bot():
    await dp.start_polling(bot)
