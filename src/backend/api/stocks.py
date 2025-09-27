from fastapi import APIRouter, HTTPException
from typing import Optional
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

@router.get("/historical/{symbol}")
async def get_historical_data(
    symbol: str,
    period: str = "1mo",
    interval: str = "1d"
):
    """
    Get historical stock data for a given symbol
    
    Args:
        symbol: Stock symbol (e.g., AAPL, MSFT)
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
        interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Convert to list of dictionaries for JSON response
        data = []
        for date, row in hist.iterrows():
            data.append({
                "date": date.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": int(row["Volume"])
            })
        
        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")

@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """Get current quote for a stock symbol"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if not info:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        return {
            "symbol": symbol,
            "price": info.get("currentPrice", 0),
            "change": info.get("regularMarketChange", 0),
            "changePercent": info.get("regularMarketChangePercent", 0),
            "volume": info.get("volume", 0),
            "marketCap": info.get("marketCap", 0),
            "companyName": info.get("longName", ""),
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching quote: {str(e)}")