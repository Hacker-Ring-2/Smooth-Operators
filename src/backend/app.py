from datetime import datetime, timezone
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from src.backend.utils.api_utils import redis_manager
from src.ai.stock_prediction.stock_prediction import StockAnalysisAgent
from contextlib import asynccontextmanager
from src.backend.db import mongodb
from src.backend.api.auth import router as auth_router
from src.backend.api.session import router as session_router
from src.backend.api.user import router as user_router
from src.backend.api.chat import router as chat_router
from src.backend.api.stocks import router as stocks_router
import os

stock_agent = StockAnalysisAgent()


@asynccontextmanager
async def on_startup(app: FastAPI):
    await mongodb.init_db()
    await redis_manager.connect()
    yield

app = FastAPI(title="Finance Insight Agent API", lifespan=on_startup)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Mount the static files
app.include_router(auth_router)
app.include_router(session_router)
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(stocks_router)

@app.get("/")
async def get():
    return {"message": "Finance Insight Agent API is running!", "status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    # asyncio.run(mongodb.init_db())
    uvicorn.run(app, host="0.0.0.0", port=8000)
    