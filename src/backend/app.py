from datetime import datetime, timezone
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Try importing modules with error handling
try:
    from src.backend.utils.api_utils import redis_manager
except ImportError:
    redis_manager = None

try:
    from src.ai.stock_prediction.stock_prediction import StockAnalysisAgent
    stock_agent = StockAnalysisAgent()
except ImportError:
    stock_agent = None

try:
    from src.backend.db import mongodb
except ImportError:
    mongodb = None

# Import routers with error handling
try:
    from src.backend.api.auth import router as auth_router
except ImportError:
    auth_router = None

try:
    from src.backend.api.session import router as session_router
except ImportError:
    session_router = None

try:
    from src.backend.api.user import router as user_router
except ImportError:
    user_router = None

try:
    from src.backend.api.chat import router as chat_router
except ImportError:
    chat_router = None

try:
    from src.backend.api.stocks import router as stocks_router
except ImportError:
    stocks_router = None

try:
    from src.backend.api.ai_analysis import router as ai_analysis_router
except ImportError:
    ai_analysis_router = None

# Load environment variables from backend .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
print(f"🔑 Gemini API Key loaded: {'✅ YES' if os.getenv('GEMINI_API_KEY') else '❌ NO'}")


@asynccontextmanager
async def on_startup(app: FastAPI):
    if mongodb:
        await mongodb.init_db()
    if redis_manager:
        await redis_manager.connect()
    yield

app = FastAPI(title="Finance Insight Agent API", lifespan=on_startup)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include routers only if they're available
if auth_router:
    app.include_router(auth_router)
if session_router:
    app.include_router(session_router)
if user_router:
    app.include_router(user_router)
if chat_router:
    app.include_router(chat_router)
if stocks_router:
    app.include_router(stocks_router)
if ai_analysis_router:
    app.include_router(ai_analysis_router)

@app.get("/")
async def get():
    return {"message": "Finance Insight Agent API is running!", "status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    # asyncio.run(mongodb.init_db())
    uvicorn.run(app, host="0.0.0.0", port=8000)
    