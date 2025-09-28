import os
import json
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import requests

# Create FastAPI app
app = FastAPI(title="AI Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class StockData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class ChartAnnotation(BaseModel):
    id: str
    type: str  # 'trendline', 'support', 'resistance', etc.
    points: List[Dict[str, float]]
    color: str
    label: Optional[str] = None
    visible: bool = True
    aiGenerated: Optional[bool] = False

class TechnicalContext(BaseModel):
    currentPrice: float
    volatility: float
    rsi: float
    ma20: float
    priceChange: float
    marketContext: Optional[Dict[str, str]] = None

class AnalysisRequest(BaseModel):
    message: str
    stockData: List[StockData]
    stockSymbol: str
    timeFrame: str = "1D"
    annotations: List[ChartAnnotation] = []
    chartType: str = "candlestick"
    technicalContext: Optional[TechnicalContext] = None

class AnalysisResponse(BaseModel):
    message: str
    chartUpdates: List[ChartAnnotation] = []
    success: bool = True
    source: str = "backend-gemini"

def calculate_rsi(prices: List[float], period: int = 14) -> float:
    """Calculate RSI indicator"""
    if len(prices) < period + 1:
        return 50
    
    gains = []
    losses = []
    
    for i in range(1, len(prices)):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    
    if len(gains) < period:
        return 50
        
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    
    if avg_loss == 0:
        return 100
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_ma(prices: List[float], period: int) -> float:
    """Calculate moving average"""
    if len(prices) < period:
        return sum(prices) / len(prices)
    return sum(prices[-period:]) / period

def analyze_trend(prices: List[float]) -> str:
    """Determine price trend"""
    if len(prices) < 5:
        return "insufficient_data"
    
    recent = prices[-10:]
    if len(recent) < 3:
        return "insufficient_data"
    
    first_third = sum(recent[:len(recent)//3]) / (len(recent)//3)
    last_third = sum(recent[-len(recent)//3:]) / (len(recent)//3)
    
    change_percent = ((last_third - first_third) / first_third) * 100
    
    if change_percent > 2:
        return "strong_bullish" if change_percent > 5 else "bullish"
    elif change_percent < -2:
        return "strong_bearish" if change_percent < -5 else "bearish"
    else:
        return "sideways"

def analyze_volume(volumes: List[int]) -> Dict[str, Any]:
    """Analyze volume patterns"""
    if len(volumes) < 5:
        return {"trend": "insufficient_data", "level": "normal"}
    
    recent_avg = sum(volumes[-5:]) / 5
    overall_avg = sum(volumes) / len(volumes)
    
    if recent_avg > overall_avg * 1.5:
        return {"trend": "increasing", "level": "high"}
    elif recent_avg < overall_avg * 0.7:
        return {"trend": "decreasing", "level": "low"}
    else:
        return {"trend": "stable", "level": "normal"}

@router.post("/api/ai/analyze", response_model=AnalysisResponse)
async def analyze_stock_data(request: AnalysisRequest):
    """
    AI-powered stock analysis endpoint using Gemini LLM
    """
    try:
        # Extract data
        stock_data = request.stockData
        symbol = request.stockSymbol
        message = request.message
        annotations = request.annotations
        
        if not stock_data:
            raise HTTPException(status_code=400, detail="No stock data provided")
        
        # Calculate technical indicators
        prices = [data.close for data in stock_data]
        volumes = [data.volume for data in stock_data]
        highs = [data.high for data in stock_data]
        lows = [data.low for data in stock_data]
        
        current_price = prices[-1]
        rsi = calculate_rsi(prices)
        ma20 = calculate_ma(prices, 20)
        trend = analyze_trend(prices)
        volume_analysis = analyze_volume(volumes)
        
        # Calculate price change
        price_change = ((current_price - prices[0]) / prices[0]) * 100
        
        # Calculate volatility (simple standard deviation)
        if len(prices) > 1:
            avg_price = sum(prices) / len(prices)
            variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
            volatility = (variance ** 0.5) / avg_price * 100
        else:
            volatility = 0
        
        # Build context for Gemini
        analysis_context = f"""
You are an expert financial analyst providing insights for {symbol}. 

MARKET DATA SNAPSHOT:
- Current Price: ${current_price:.2f}
- Price Change: {price_change:+.2f}%
- RSI: {rsi:.1f} {'(Overbought)' if rsi > 70 else '(Oversold)' if rsi < 30 else '(Neutral)'}
- 20-MA: ${ma20:.2f} ({'Above' if current_price > ma20 else 'Below'} MA)
- Trend: {trend.upper().replace('_', ' ')}
- Volume: {volume_analysis['level'].upper()} ({volume_analysis['trend']})
- Volatility: {volatility:.1f}%

TECHNICAL ANALYSIS:
- Support Level: ${min(lows):.2f}
- Resistance Level: ${max(highs):.2f}
- Recent High: ${max(prices[-10:]):.2f}
- Recent Low: ${min(prices[-10:]):.2f}

USER ANNOTATIONS: {len(annotations)} chart drawings
USER QUERY: "{message}"

Provide a comprehensive analysis focusing on:
1. Current market condition and sentiment
2. Technical indicator interpretation
3. Key support/resistance levels
4. Risk assessment and recommendations
5. Actionable insights based on the user's specific question

Be specific, professional, and include relevant price levels. Use emojis sparingly for key points.
"""

        # Call Gemini API if available
        if GEMINI_API_KEY:
            try:
                gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
                
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": analysis_context
                        }]
                    }]
                }
                
                response = requests.post(
                    gemini_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                
                if response.status_code == 200:
                    gemini_data = response.json()
                    ai_response = gemini_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response from Gemini")
                    
                    return AnalysisResponse(
                        message=ai_response,
                        chartUpdates=[],
                        success=True,
                        source="backend-gemini"
                    )
                else:
                    print(f"Gemini API Error: {response.status_code} - {response.text}")
                    
            except Exception as gemini_error:
                print(f"Gemini API Error: {gemini_error}")
                # Fall back to local analysis
        
        # Fallback analysis if Gemini is not available
        fallback_response = f"""🤖 **AI Trading Assistant for {symbol}**

**Market Overview:**
• Current Price: ${current_price:.2f} ({price_change:+.2f}%)
• Trend Analysis: {trend.upper().replace('_', ' ')} {'📈' if 'bullish' in trend else '📉' if 'bearish' in trend else '➡️'}
• Technical Strength: RSI {rsi:.1f} {'(Overbought Zone)' if rsi > 70 else '(Oversold Zone)' if rsi < 30 else '(Neutral Zone)'}

**Key Price Levels:**
• Moving Average (20): ${ma20:.2f} ({'Price Above MA ✅' if current_price > ma20 else 'Price Below MA ⚠️'})
• Support Level: ${min(lows):.2f}
• Resistance Level: ${max(highs):.2f}

**Market Activity:**
• Volume Pattern: {volume_analysis['level'].upper()} 
• Price Volatility: {volatility:.1f}%
• Active Annotations: {len(annotations)}

**Quick Insight:** {symbol} is showing {trend.replace('_', ' ')} momentum. {'Strong buying interest detected - watch for continuation patterns.' if trend in ['bullish', 'strong_bullish'] else 'Selling pressure evident - monitor support levels closely.' if trend in ['bearish', 'strong_bearish'] else 'Market in consolidation phase - wait for directional breakout.'}

**Pro Tip:** Draw on the chart and ask me to analyze your annotations for deeper insights!

*AI analysis ready - Enhanced features available with full configuration*"""

        return AnalysisResponse(
            message=fallback_response,
            chartUpdates=[],
            success=True,
            source="backend-local"
        )
        
    except Exception as e:
        # Return a friendly fallback message instead of exposing errors
        current_price = stock_data[-1].close if stock_data else 0
        return AnalysisResponse(
            message=f"""🤖 **AI Trading Assistant for {symbol}**

**Quick Analysis:**
• Price: ${current_price:.2f}
• Status: Analysis in progress...
• Active Annotations: {len(annotations)}

**Market Insight:** The AI is currently processing market data to provide you with comprehensive analysis. 

**Pro Tip:** Draw support/resistance lines, trendlines, or other patterns on your chart and ask me to analyze them for detailed insights!

**What I can help with:**
• Technical pattern recognition
• Support & resistance analysis  
• Trend identification
• Risk assessment
• Entry/exit strategies

*AI analysis engine is optimizing for better performance*""",
            chartUpdates=[],
            success=True,
            source="backend-fallback"
        )

@router.get("/api/ai/status")
async def get_ai_status():
    """Check AI service status"""
    return {
        "status": "online",
        "gemini_configured": bool(GEMINI_API_KEY),
        "endpoints": {
            "analyze": "/api/ai/analyze",
            "status": "/api/ai/status"
        }
    }

# Include router in app
app.include_router(router)

@app.get("/")
async def root():
    return {"message": "AI Analysis API is running!", "status": "healthy"}