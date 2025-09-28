import { NextRequest, NextResponse } from 'next/server';

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartAnnotation {
  id: string;
  type: 'trendline' | 'support' | 'resistance' | 'point' | 'rectangle' | 'circle';
  points: { x: number; y: number }[];
  color: string;
  label?: string;
  visible: boolean;
  aiGenerated?: boolean;
}

interface AnalysisRequest {
  message: string;
  originalMessage?: string;
  stockData: StockData[];
  stockSymbol: string;
  timeFrame: string;
  annotations: ChartAnnotation[];
  chartType: string;
  technicalContext?: {
    currentPrice: number;
    volatility: number;
    rsi: number;
    ma20: number;
    priceChange: number;
    technicalAnalysis?: any;
    marketContext?: {
      trend: string;
      strength: string;
      momentum: string;
      volume: string;
    };
  };
}

// Smart Analysis Helper Functions
function getTrendEmoji(trend: string): string {
  switch (trend) {
    case 'strong_bullish': return '🚀';
    case 'bullish': return '📈';
    case 'strong_bearish': return '💥';
    case 'bearish': return '📉';
    case 'sideways': return '➡️';
    default: return '❓';
  }
}

function getMomentumEmoji(momentum: string): string {
  switch (momentum) {
    case 'overbought': return '🔴';
    case 'oversold': return '🟢';
    case 'neutral': return '🟡';
    default: return '⚪';
  }
}

function getStrengthEmoji(strength: string): string {
  return strength === 'strong' ? '💪' : '📊';
}

function getVolumeEmoji(volume: string): string {
  switch (volume) {
    case 'high': return '🔥';
    case 'low': return '😴';
    case 'normal': return '📊';
    default: return '❓';
  }
}

function getRSIStatus(rsi: number): string {
  if (rsi > 70) return '(Overbought - Consider Selling 🔴)';
  if (rsi < 30) return '(Oversold - Consider Buying 🟢)';
  return '(Neutral Zone 🟡)';
}

function generateSmartInsights(marketContext: any, technicalContext: any, message: string): string {
  const insights = [];
  
  // Trend-based insights
  if (marketContext.trend === 'strong_bullish') {
    insights.push('🚀 Strong uptrend detected - Momentum is building for higher prices');
  } else if (marketContext.trend === 'strong_bearish') {
    insights.push('💥 Strong downtrend active - Consider protective measures');
  } else if (marketContext.trend === 'sideways') {
    insights.push('➡️ Consolidation phase - Watch for breakout signals');
  }
  
  // RSI-based insights
  if (technicalContext.rsi > 70 && technicalContext.currentPrice > technicalContext.ma20) {
    insights.push('⚠️ Overbought conditions with bullish trend - Potential pullback ahead');
  } else if (technicalContext.rsi < 30 && technicalContext.currentPrice < technicalContext.ma20) {
    insights.push('💚 Oversold conditions in bearish trend - Potential bounce opportunity');
  }
  
  // Volume insights
  if (marketContext.volume === 'high' && marketContext.trend.includes('bullish')) {
    insights.push('🔥 High volume supporting bullish move - Strong conviction');
  } else if (marketContext.volume === 'low') {
    insights.push('😴 Low volume - Price moves may lack conviction');
  }
  
  // MA-based insights
  if (technicalContext.currentPrice > technicalContext.ma20) {
    insights.push('📈 Price above 20-MA suggests bullish momentum');
  } else {
    insights.push('📉 Price below 20-MA indicates bearish pressure');
  }
  
  return insights.join('\n• ') || '• Market is in a neutral state - Monitor for clear signals';
}

function generateActionRecommendations(marketContext: any, technicalContext: any): string {
  const recommendations = [];
  
  // Primary trend recommendation
  if (marketContext.trend === 'strong_bullish' && technicalContext.rsi < 70) {
    recommendations.push('🟢 **BUY SIGNAL**: Strong uptrend with room to run');
  } else if (marketContext.trend === 'strong_bearish' && technicalContext.rsi > 30) {
    recommendations.push('🔴 **SELL SIGNAL**: Strong downtrend with further downside');
  } else if (marketContext.trend === 'sideways') {
    recommendations.push('🟡 **HOLD/WAIT**: Range-bound - Wait for clear breakout');
  }
  
  // Risk management
  if (technicalContext.volatility > 25) {
    recommendations.push('⚠️ **HIGH VOLATILITY**: Use smaller position sizes');
  }
  
  // Entry/Exit levels
  if (technicalContext.rsi < 30) {
    recommendations.push('💚 **OVERSOLD**: Consider buying near support levels');
  } else if (technicalContext.rsi > 70) {
    recommendations.push('🔴 **OVERBOUGHT**: Consider taking profits or tightening stops');
  }
  
  return recommendations.join('\n• ') || '• Monitor key levels and wait for clearer signals';
}

function generateSmartChartUpdates(technicalContext: any): any[] {
  const updates = [];
  
  // Add MA level indicator
  if (technicalContext.ma20) {
    updates.push({
      id: `smart-ma20-${Date.now()}`,
      type: 'support',
      points: [{ x: 0, y: technicalContext.ma20 }, { x: 100, y: technicalContext.ma20 }],
      color: '#fbbf24',
      label: `Smart MA20 $${technicalContext.ma20.toFixed(2)}`,
      visible: true,
      aiGenerated: true
    });
  }
  
  return updates;
}

// Gemini AI Integration
async function callGeminiAPI(prompt: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

// Technical Analysis Functions
function calculateMovingAverage(data: StockData[], period: number): number[] {
  return data.map((_, index) => {
    if (index < period - 1) return 0;
    const sum = data.slice(index - period + 1, index + 1).reduce((acc, curr) => acc + curr.close, 0);
    return sum / period;
  });
}

function findSupportResistanceLevels(data: StockData[]) {
  if (!data || data.length < 10) return { support: [], resistance: [] };
  
  const prices = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  const currentPrice = prices[prices.length - 1];
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  // Simple support/resistance calculation
  const support = Math.min(...lows) + (avgPrice - Math.min(...lows)) * 0.3;
  const resistance = Math.max(...highs) - (Math.max(...highs) - avgPrice) * 0.3;
  
  return {
    support: [support],
    resistance: [resistance],
    currentPrice,
    avgPrice
  };
}

function analyzeTrend(data: StockData[]) {
  if (!data || data.length < 3) return 'insufficient_data';
  
  const recent = data.slice(-10);
  const prices = recent.map(d => d.close);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  
  const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  if (changePercent > 2) return 'bullish';
  if (changePercent < -2) return 'bearish';
  return 'sideways';
}

function analyzeVolume(data: StockData[]) {
  if (!data || data.length < 5) return { trend: 'insufficient_data', avgVolume: 0, currentVolume: 0 };
  
  const volumes = data.map(d => d.volume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const recentAvg = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  
  let trend = 'normal';
  if (recentAvg > avgVolume * 1.5) trend = 'high';
  if (recentAvg < avgVolume * 0.5) trend = 'low';
  
  return { trend, avgVolume, currentVolume, recentAvg };
}

// Enhanced Technical Analysis Functions
function calculateVolatility(data: StockData[], periods: number = 20): number {
  if (!data || data.length < periods) return 0;
  
  const returns = data.slice(1).map((d, i) => {
    const prevClose = data[i].close;
    return Math.log(d.close / prevClose);
  });
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance * 252) * 100; // Annualized volatility as percentage
}

function calculateRSI(data: StockData[], period: number = 14): number {
  if (!data || data.length < period + 1) return 50;
  
  const changes = data.slice(1).map((d, i) => d.close - data[i].close);
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateBollingerBands(data: StockData[], period: number = 20, stdDev: number = 2) {
  if (!data || data.length < period) return { upper: 0, middle: 0, lower: 0 };
  
  const prices = data.slice(-period).map(d => d.close);
  const sma = prices.reduce((a, b) => a + b, 0) / period;
  
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  };
}

function identifyChartPatterns(data: StockData[]): string[] {
  if (!data || data.length < 10) return [];
  
  const patterns = [];
  const prices = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  
  // Simple pattern detection
  const recent = prices.slice(-5);
  const isAscending = recent.every((price, i) => i === 0 || price >= recent[i - 1]);
  const isDescending = recent.every((price, i) => i === 0 || price <= recent[i - 1]);
  
  if (isAscending) patterns.push('Ascending Price Action');
  if (isDescending) patterns.push('Descending Price Action');
  
  // Double top/bottom detection
  const recentHighs = highs.slice(-10);
  const maxHigh = Math.max(...recentHighs);
  const highCount = recentHighs.filter(h => h > maxHigh * 0.98).length;
  if (highCount >= 2) patterns.push('Potential Double Top');
  
  const recentLows = lows.slice(-10);
  const minLow = Math.min(...recentLows);
  const lowCount = recentLows.filter(l => l < minLow * 1.02).length;
  if (lowCount >= 2) patterns.push('Potential Double Bottom');
  
  return patterns;
}

export async function POST(request: NextRequest) {
  console.log("🔥 AI Analysis API POST request received - Proxying to backend on port 8001");
  
  let body: AnalysisRequest;
  
  try {
    const requestText = await request.text();
    console.log("📝 Raw request body length:", requestText.length);
    
    if (!requestText.trim()) {
      throw new Error("Empty request body");
    }
    
    body = JSON.parse(requestText);
    console.log("✅ Successfully parsed request JSON");
  } catch (parseError) {
    console.error('❌ JSON Parse Error:', parseError);
    return NextResponse.json({
      message: "❌ **Request Error**\n\nInvalid request format. Please check your data and try again.",
      chartUpdates: [],
      success: false,
      error: 'Invalid JSON in request body',
      details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
    }, { 
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  try {
    const { message, stockData, stockSymbol, timeFrame, annotations, chartType } = body;

    // First, try to call your backend on port 8000
    console.log("🚀 Attempting to connect to backend at http://localhost:8000/api/ai/analyze");
    
    try {
      const backendResponse = await fetch('http://localhost:8000/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        console.log("✅ Backend response received successfully");
        
        return NextResponse.json({
          ...backendData,
          success: true,
          source: 'backend-gemini'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        });
      } else {
        console.log(`⚠️ Backend returned ${backendResponse.status}: ${backendResponse.statusText}`);
        throw new Error(`Backend returned status ${backendResponse.status}`);
      }
    } catch (fetchError) {
      console.log("❌ Backend connection failed:", fetchError);
      console.log("🔄 Falling back to local Gemini API or smart analysis...");
      
      // Fall through to existing Gemini/local analysis logic
    }

    // Perform technical analysis
    const supportResistance = findSupportResistanceLevels(stockData);
    const trend = analyzeTrend(stockData);
    const volumeAnalysis = analyzeVolume(stockData);
    const ma20 = calculateMovingAverage(stockData, 20);
    
    // Enhanced price momentum and volatility calculations
    const priceChange = stockData[stockData.length - 1]?.close - stockData[0]?.close;
    const priceChangePercent = ((priceChange / stockData[0]?.close) * 100).toFixed(2);
    const volatility = calculateVolatility(stockData);
    const rsi = calculateRSI(stockData, 14);
    const bollinger = calculateBollingerBands(stockData, 20);
    
    // Build enhanced context for Gemini
    const analysisContext = `
You are an expert financial analyst and trading assistant with deep knowledge of technical analysis, market psychology, and trading strategies. You're helping a trader analyze ${stockSymbol}.

📊 CURRENT MARKET SNAPSHOT:
- Symbol: ${stockSymbol}
- Time Frame: ${timeFrame}
- Chart Type: ${chartType}
- Current Price: $${stockData[stockData.length - 1]?.close.toFixed(2)}
- Session Change: ${priceChange >= 0 ? '+' : ''}$${priceChange?.toFixed(2)} (${priceChangePercent}%)
- Volatility: ${volatility.toFixed(2)}%

📈 TECHNICAL ANALYSIS:
- Overall Trend: ${trend.toUpperCase()} ${trend === 'bullish' ? '🟢' : trend === 'bearish' ? '🔴' : '🟡'}
- Key Support: $${supportResistance.support[0]?.toFixed(2)} ${stockData[stockData.length - 1]?.close > supportResistance.support[0] ? '✅ Holding' : '⚠️ At Risk'}
- Key Resistance: $${supportResistance.resistance[0]?.toFixed(2)} ${stockData[stockData.length - 1]?.close < supportResistance.resistance[0] ? '✅ Below' : '🚨 Testing'}
- RSI (14): ${rsi.toFixed(1)} ${rsi > 70 ? '(Overbought 🔴)' : rsi < 30 ? '(Oversold 🟢)' : '(Neutral 🟡)'}
- 20-MA: $${ma20[ma20.length - 1]?.toFixed(2)} ${stockData[stockData.length - 1]?.close > ma20[ma20.length - 1] ? '(Above 🟢)' : '(Below 🔴)'}

📊 VOLUME ANALYSIS:
- Current Volume: ${(volumeAnalysis.currentVolume / 1000000).toFixed(1)}M shares
- Average Volume: ${(volumeAnalysis.avgVolume / 1000000).toFixed(1)}M shares
- Volume Trend: ${volumeAnalysis.trend.toUpperCase()} ${volumeAnalysis.trend === 'high' ? '🔥 (High Interest)' : volumeAnalysis.trend === 'low' ? '😴 (Low Interest)' : '📊 (Normal)'}
- Volume vs Average: ${((volumeAnalysis.currentVolume / volumeAnalysis.avgVolume) * 100).toFixed(0)}%

📋 CHART ANNOTATIONS:
- Active Drawings: ${annotations.length}
- User Annotations: ${annotations.filter(a => !a.aiGenerated).map(a => a.type).join(', ') || 'None'}
- AI Annotations: ${annotations.filter(a => a.aiGenerated).map(a => a.type).join(', ') || 'None'}

📈 RECENT PRICE ACTION (Last 5 Periods):
${stockData.slice(-5).map((d, i) => {
  const prevClose = i > 0 ? stockData.slice(-5)[i-1].close : d.open;
  const change = d.close - prevClose;
  const changePercent = ((change / prevClose) * 100).toFixed(1);
  return `${i + 1}. ${new Date(d.date).toLocaleDateString()}: $${d.close.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePercent}%) Vol: ${(d.volume / 1000000).toFixed(1)}M`;
}).join('\n')}

🎯 USER QUERY: "${message}"

📝 INSTRUCTIONS:
1. Analyze the user's question in context of the market data
2. Provide specific, actionable insights based on technical analysis
3. If asked about entry/exit points, consider risk management
4. Use clear explanations with relevant emojis
5. If the analysis suggests chart annotations, specify what to highlight
6. Be conversational but professional
7. Always consider market psychology and sentiment
8. Provide specific price levels when relevant
9. Mention potential catalysts or market factors when applicable
10. If user asks about patterns, identify specific chart patterns

Respond as a knowledgeable trading mentor would, with actionable insights and clear reasoning.
    `;

    console.log("🧠 Processing smart analysis request...");
    console.log("📊 Technical Context:", body.technicalContext);
    console.log("💬 Enhanced Message:", body.message);
    console.log("🔍 Original Message:", body.originalMessage);

    // Smart contextual analysis - use enhanced message and technical context
    const enhancedMessage = body.message || message;
    const technicalContext = body.technicalContext;
    const marketContext = technicalContext?.marketContext;

    // Generate smart response based on enhanced context
    if (marketContext && technicalContext) {
      console.log("🚀 Using enhanced technical analysis...");
      
      const smartAnalysis = `🧠 **Smart Technical Analysis for ${stockSymbol}**

**📈 Current Market State:**
• **Trend:** ${marketContext.trend?.toUpperCase().replace('_', ' ')} ${getTrendEmoji(marketContext.trend)}
• **Momentum:** ${marketContext.momentum?.toUpperCase()} ${getMomentumEmoji(marketContext.momentum)}
• **Strength:** ${marketContext.strength?.toUpperCase()} ${getStrengthEmoji(marketContext.strength)}
• **Volume:** ${marketContext.volume?.toUpperCase()} ${getVolumeEmoji(marketContext.volume)}

**💹 Key Metrics:**
• **Current Price:** $${technicalContext.currentPrice?.toFixed(2)}
• **20-MA:** $${technicalContext.ma20?.toFixed(2)} ${technicalContext.currentPrice > technicalContext.ma20 ? '(Above - Bullish 🟢)' : '(Below - Bearish 🔴)'}
• **RSI:** ${technicalContext.rsi?.toFixed(1)} ${getRSIStatus(technicalContext.rsi)}
• **Volatility:** ${technicalContext.volatility?.toFixed(1)}%

**🎯 Smart Insights:**
${generateSmartInsights(marketContext, technicalContext, enhancedMessage)}

**💡 Action Recommendations:**
${generateActionRecommendations(marketContext, technicalContext)}

*This is enhanced AI analysis using advanced technical indicators and market context.*`;

      return NextResponse.json({
        message: smartAnalysis,
        chartUpdates: generateSmartChartUpdates(technicalContext),
        success: true,
        analysisType: 'smart-enhanced'
      });
    }

    // Check for support/resistance validation questions
    if ((message.toLowerCase().includes('support') || message.toLowerCase().includes('resistance') || 
         message.toLowerCase().includes('valid') || message.toLowerCase().includes('level')) && 
        annotations.length > 0) {
      
      console.log("🎯 Support/Resistance validation detected! Processing annotations...");
      const latestAnnotation = annotations[annotations.length - 1];
      
      if (latestAnnotation && latestAnnotation.points?.length >= 2) {
        const [start, end] = latestAnnotation.points;
        console.log("📊 Validating trendline points:", { start, end });
        
        if (start.y && end.y && !isNaN(start.y) && !isNaN(end.y)) {
          const avgPrice = (start.y + end.y) / 2;
          const currentPrice = stockData[stockData.length - 1]?.close || 0;
          const messageLower = message.toLowerCase();
          
          // Determine if checking support or resistance
          const isCheckingSupport = messageLower.includes('support') || avgPrice < currentPrice;
          const isCheckingResistance = messageLower.includes('resistance') || avgPrice > currentPrice;
          
          // Simple validation logic for API
          const tolerance = 0.02; // 2%
          const recentLows = stockData.slice(-20).map(d => d.low);
          const recentHighs = stockData.slice(-20).map(d => d.high);
          
          let validationResponse = "";
          
          if (isCheckingSupport) {
            const nearestLow = Math.min(...recentLows);
            const distanceFromLow = Math.abs(avgPrice - nearestLow) / avgPrice;
            const isValidSupport = distanceFromLow <= tolerance;
            
            validationResponse = `🔍 **Support Level Validation for ${stockSymbol}**

**Your Trendline:** $${avgPrice.toFixed(2)}
**Validation Result:** ${isValidSupport ? '✅ VALID SUPPORT LEVEL' : '❌ NOT A VALID SUPPORT LEVEL'}

**Analysis:**
• **Nearest Recent Low:** $${nearestLow.toFixed(2)}
• **Distance:** ${(distanceFromLow * 100).toFixed(1)}% ${distanceFromLow <= 0.01 ? '(Very Close ✅)' : distanceFromLow <= 0.02 ? '(Close ⚡)' : '(Too Far ❌)'}
• **Current Price:** $${currentPrice.toFixed(2)}

**Conclusion:**
${isValidSupport ? 
  'This trendline aligns well with recent support levels! Price has shown support around this area, making it a valid level to watch for bounces.' :
  `This trendline doesn't align with strong historical support. Consider drawing closer to $${nearestLow.toFixed(2)} for a more accurate support analysis.`
}

*For detailed historical analysis, upgrade to full AI analysis with Gemini API.*`;
          } else if (isCheckingResistance) {
            const nearestHigh = Math.max(...recentHighs);
            const distanceFromHigh = Math.abs(avgPrice - nearestHigh) / avgPrice;
            const isValidResistance = distanceFromHigh <= tolerance;
            
            validationResponse = `🔍 **Resistance Level Validation for ${stockSymbol}**

**Your Trendline:** $${avgPrice.toFixed(2)}
**Validation Result:** ${isValidResistance ? '✅ VALID RESISTANCE LEVEL' : '❌ NOT A VALID RESISTANCE LEVEL'}

**Analysis:**
• **Nearest Recent High:** $${nearestHigh.toFixed(2)}
• **Distance:** ${(distanceFromHigh * 100).toFixed(1)}% ${distanceFromHigh <= 0.01 ? '(Very Close ✅)' : distanceFromHigh <= 0.02 ? '(Close ⚡)' : '(Too Far ❌)'}
• **Current Price:** $${currentPrice.toFixed(2)}

**Conclusion:**
${isValidResistance ? 
  'This trendline aligns well with recent resistance levels! Price has faced rejection around this area, making it a valid level to watch for reversals.' :
  `This trendline doesn't align with strong historical resistance. Consider drawing closer to $${nearestHigh.toFixed(2)} for a more accurate resistance analysis.`
}

*For detailed historical analysis, upgrade to full AI analysis with Gemini API.*`;
          }

          return NextResponse.json({
            message: validationResponse,
            chartUpdates: [],
            success: true,
            analysisType: 'support-resistance-validation'
          });
        }
      }
    }

    // Check for specific trendline analysis requests
    if (message.toLowerCase().includes('trendline') || message.toLowerCase().includes('analyze the') || 
        (message.toLowerCase().includes('drew') && annotations.length > 0)) {
      
      console.log("🎯 Trendline analysis detected! Processing annotations...");
      const latestAnnotation = annotations[annotations.length - 1];
      
      if (latestAnnotation && latestAnnotation.type === 'trendline' && latestAnnotation.points?.length >= 2) {
        const [start, end] = latestAnnotation.points;
        console.log("📊 Analyzing trendline points:", { start, end });
        
        if (start.y && end.y && !isNaN(start.y) && !isNaN(end.y)) {
          const priceChange = end.y - start.y;
          const priceChangePercent = (priceChange / start.y) * 100;
          const currentPrice = stockData[stockData.length - 1]?.close || 0;
          const volatility = calculateVolatility(stockData);
          const rsi = calculateRSI(stockData);
          
          const trendlineAnalysis = `🎯 **Detailed Trendline Analysis for ${stockSymbol}**

**📈 Your Trendline:**
• **Start Point:** $${start.y.toFixed(2)}
• **End Point:** $${end.y.toFixed(2)}
• **Price Movement:** ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent.toFixed(2)}%)
• **Direction:** ${priceChange > 0 ? 'BULLISH 🟢' : 'BEARISH 🔴'}

**📊 Market Context:**
• **Current Price:** $${currentPrice.toFixed(2)}
• **RSI:** ${rsi.toFixed(1)} ${rsi > 70 ? '(Overbought)' : rsi < 30 ? '(Oversold)' : '(Neutral)'}
• **Volatility:** ${volatility.toFixed(1)}%

**💡 Trading Insights:**
${priceChange > 0 ? 
  `🚀 **Bullish Trendline Detected:**
• Strong upward momentum from your drawing
• Price appreciation of ${priceChangePercent.toFixed(2)}%
• Consider this as potential support level
• Watch for breakouts above $${end.y.toFixed(2)} for continuation` :
  `⚠️ **Bearish Trendline Detected:**
• Downward pressure indicated
• Price decline of ${Math.abs(priceChangePercent).toFixed(2)}%
• This could act as resistance level  
• Watch for breaks below $${end.y.toFixed(2)} for further decline`
}

**🎪 Action Plan:**
${Math.abs(priceChangePercent) > 3 ? 
  `Strong trend - ${priceChange > 0 ? 'Look for pullbacks to buy' : 'Consider protective stops'}` :
  `Moderate trend - Wait for volume confirmation before acting`
}

*This analysis is based on your drawn trendline and current market data.*`;

          return NextResponse.json({
            message: trendlineAnalysis,
            chartUpdates: [],
            success: true,
            analysisType: 'trendline'
          });
        }
      }
    }

    // Try Gemini API directly as fallback (if API key is configured)
    let geminiResponse = null;
    
    try {
      console.log("🤖 Attempting direct Gemini API call as secondary fallback...");
      geminiResponse = await callGeminiAPI(analysisContext);
      console.log("✅ Direct Gemini API call successful");
    } catch (geminiError) {
      console.log("❌ Direct Gemini API also failed:", geminiError);
      console.log("🔄 Using smart local analysis instead...");
    }
    
    // Generate chart updates based on analysis and user query
    const chartUpdates: ChartAnnotation[] = [];
    
    const userMessageLower = message.toLowerCase();
    
    // Auto-generate support/resistance lines if requested
    if (userMessageLower.includes('support') || userMessageLower.includes('resistance') || 
        userMessageLower.includes('level') || userMessageLower.includes('key level')) {
      
      if (supportResistance.support[0]) {
        chartUpdates.push({
          id: `ai-support-${Date.now()}`,
          type: 'support',
          points: [{ x: 0, y: supportResistance.support[0] }, { x: 100, y: supportResistance.support[0] }],
          color: '#ef4444',
          label: `AI Support $${supportResistance.support[0].toFixed(2)}`,
          visible: true,
          aiGenerated: true
        });
      }
      
      if (supportResistance.resistance[0]) {
        chartUpdates.push({
          id: `ai-resistance-${Date.now()}`,
          type: 'resistance',
          points: [{ x: 0, y: supportResistance.resistance[0] }, { x: 100, y: supportResistance.resistance[0] }],
          color: '#22c55e',
          label: `AI Resistance $${supportResistance.resistance[0].toFixed(2)}`,
          visible: true,
          aiGenerated: true
        });
      }
    }
    
    // Add trend line if trend analysis is requested
    if (userMessageLower.includes('trend') && stockData.length >= 10) {
      const recentData = stockData.slice(-10);
      const startPrice = recentData[0].close;
      const endPrice = recentData[recentData.length - 1].close;
      
      chartUpdates.push({
        id: `ai-trendline-${Date.now()}`,
        type: 'trendline',
        points: [
          { x: 0, y: startPrice },
          { x: 100, y: endPrice }
        ],
        color: trend === 'bullish' ? '#22c55e' : trend === 'bearish' ? '#ef4444' : '#6b7280',
        label: `AI Trend (${trend})`,
        visible: true,
        aiGenerated: true
      });
    }

    // Return response - use Gemini if available, otherwise use smart fallback
    if (geminiResponse) {
      return NextResponse.json({
        message: geminiResponse,
        chartUpdates,
        analysisData: {
          trend,
          supportResistance,
          volumeAnalysis,
          technicalIndicators: {
            ma20: ma20[ma20.length - 1],
            rsi: calculateRSI(stockData),
            volatility: calculateVolatility(stockData)
          }
        },
        success: true,
        source: 'direct-gemini'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      // Use smart local analysis if neither backend nor Gemini work
      console.log("🧠 Using enhanced local analysis as final fallback...");
      throw new Error("Forcing fallback to local analysis");
    }

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Use the already parsed body for fallback analysis
    const { stockData, stockSymbol, message, timeFrame } = body;
    
    // Enhanced fallback with smart local analysis
    if (!stockData || stockData.length === 0) {
      return NextResponse.json({
        message: "Please load some stock data first, then I can provide detailed technical analysis! 📊",
        chartUpdates: [],
        analysisData: null,
        success: false,
        error: 'No stock data available'
      }, { status: 200 });
    }

    // Perform technical analysis for fallback
    const supportResistance = findSupportResistanceLevels(stockData);
    const trend = analyzeTrend(stockData);
    const volumeAnalysis = analyzeVolume(stockData);
    const ma20 = calculateMovingAverage(stockData, 20);
    const volatility = calculateVolatility(stockData);
    const rsi = calculateRSI(stockData);
    const patterns = identifyChartPatterns(stockData);
    const currentPrice = stockData[stockData.length - 1]?.close;
    const priceChange = currentPrice - stockData[0]?.close;
    const priceChangePercent = ((priceChange / stockData[0]?.close) * 100);
    
    // Generate intelligent fallback response based on user query and data
    const userMessageLower = message.toLowerCase();
    let smartResponse = '';
    
    // Handle support/resistance validation in fallback
    if ((userMessageLower.includes('support') || userMessageLower.includes('resistance') || 
         userMessageLower.includes('valid') || userMessageLower.includes('level')) && 
         body.annotations && body.annotations.length > 0) {
      
      const latestAnnotation = body.annotations[body.annotations.length - 1];
      if (latestAnnotation && latestAnnotation.points && latestAnnotation.points.length >= 2) {
        const [start, end] = latestAnnotation.points;
        
        if (start.y && end.y && !isNaN(start.y) && !isNaN(end.y)) {
          const avgPrice = (start.y + end.y) / 2;
          const currentPrice = stockData[stockData.length - 1]?.close || 0;
          const isCheckingSupport = userMessageLower.includes('support') || avgPrice < currentPrice;
          
          // Simple validation
          const recentData = stockData.slice(-15);
          const recentLows = recentData.map(d => d.low);
          const recentHighs = recentData.map(d => d.high);
          
          if (isCheckingSupport) {
            const minLow = Math.min(...recentLows);
            const distance = Math.abs(avgPrice - minLow) / avgPrice * 100;
            const isValid = distance <= 3; // 3% tolerance for fallback
            
            smartResponse = `🔍 **Support Level Validation (Local Analysis)**

**Your Trendline:** $${avgPrice.toFixed(2)}
**Result:** ${isValid ? '✅ APPEARS TO BE VALID SUPPORT' : '❌ NOT A STRONG SUPPORT LEVEL'}

**Quick Analysis:**
• **Recent Low:** $${minLow.toFixed(2)}
• **Distance:** ${distance.toFixed(1)}%
• **Current Price:** $${currentPrice.toFixed(2)}

${isValid ? 
  '✅ **Valid Support:** Your trendline aligns well with recent price lows. This level has shown support characteristics and could be a good area to watch for bounces.' :
  `⚠️ **Weak Support:** Your trendline is ${distance.toFixed(1)}% away from the nearest support at $${minLow.toFixed(2)}. Consider adjusting your line closer to actual support levels for better accuracy.`
}

**💡 Tip:** Draw trendlines connecting actual price lows for the most accurate support analysis!

*Upgrade to Gemini AI for comprehensive historical support/resistance analysis!*`;
          } else {
            const maxHigh = Math.max(...recentHighs);
            const distance = Math.abs(avgPrice - maxHigh) / avgPrice * 100;
            const isValid = distance <= 3; // 3% tolerance for fallback
            
            smartResponse = `🔍 **Resistance Level Validation (Local Analysis)**

**Your Trendline:** $${avgPrice.toFixed(2)}
**Result:** ${isValid ? '✅ APPEARS TO BE VALID RESISTANCE' : '❌ NOT A STRONG RESISTANCE LEVEL'}

**Quick Analysis:**
• **Recent High:** $${maxHigh.toFixed(2)}
• **Distance:** ${distance.toFixed(1)}%
• **Current Price:** $${currentPrice.toFixed(2)}

${isValid ? 
  '✅ **Valid Resistance:** Your trendline aligns well with recent price highs. This level has shown resistance characteristics and could be a good area to watch for reversals.' :
  `⚠️ **Weak Resistance:** Your trendline is ${distance.toFixed(1)}% away from the nearest resistance at $${maxHigh.toFixed(2)}. Consider adjusting your line closer to actual resistance levels for better accuracy.`
}

**💡 Tip:** Draw trendlines connecting actual price highs for the most accurate resistance analysis!

*Upgrade to Gemini AI for comprehensive historical support/resistance analysis!*`;
          }
        } else {
          smartResponse = `⚠️ **Validation Error:** Unable to validate trendline due to coordinate issues. Please redraw the line on the price chart area.`;
        }
      }
    } else if ((userMessageLower.includes('trendline') || userMessageLower.includes('analyze the') || 
         userMessageLower.includes('drew')) && body.annotations && body.annotations.length > 0) {
      
      const latestAnnotation = body.annotations[body.annotations.length - 1];
      if (latestAnnotation && latestAnnotation.points && latestAnnotation.points.length >= 2) {
        const [start, end] = latestAnnotation.points;
        
        if (start.y && end.y && !isNaN(start.y) && !isNaN(end.y)) {
          const priceChange = end.y - start.y;
          const priceChangePercent = (priceChange / start.y) * 100;
          
          smartResponse = `🎯 **Smart Trendline Analysis (Local)**

**📊 Your Line Analysis:**
• **From:** $${start.y.toFixed(2)} **To:** $${end.y.toFixed(2)}
• **Change:** ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent.toFixed(2)}%)
• **Trend:** ${priceChange > 0 ? 'BULLISH 📈' : 'BEARISH 📉'}

**💡 Key Insights:**
${priceChange > 0 ? 
  `🟢 **Bullish Signal:** Your trendline shows upward momentum of ${priceChangePercent.toFixed(1)}%
  • This suggests buying interest at lower levels
  • Price target could be around $${(end.y + Math.abs(priceChange)).toFixed(2)}
  • Use $${start.y.toFixed(2)} as support level` :
  `🔴 **Bearish Signal:** Your trendline shows downward pressure of ${Math.abs(priceChangePercent).toFixed(1)}%
  • This indicates selling pressure
  • Next support might be around $${(end.y - Math.abs(priceChange)).toFixed(2)}
  • Use $${start.y.toFixed(2)} as resistance level`
}

**⚡ Strength:** ${Math.abs(priceChangePercent) > 5 ? 'STRONG 💪' : Math.abs(priceChangePercent) > 2 ? 'MODERATE ⚡' : 'WEAK 📊'}

**🚀 Quick Action:**
${Math.abs(priceChangePercent) > 3 ? 
  (priceChange > 0 ? 'Strong uptrend - Consider buying on pullbacks!' : 'Strong downtrend - Consider profit taking!') :
  'Moderate trend - Wait for volume confirmation before trading.'
}

*Upgrade to full AI analysis for deeper insights and market context!*`;
        } else {
          smartResponse = `⚠️ **Trendline Analysis Issue:**
          
I can see you drew a line, but there's an issue with the coordinate data:
• Start Y: ${start.y}
• End Y: ${end.y}

This might be due to chart scaling issues. Try:
1. Refreshing the page
2. Ensuring stock data is loaded
3. Drawing the line again on the price chart

💡 *The coordinates should show actual price values, not chart pixels.*`;
        }
      }
    } else if (userMessageLower.includes('trend') || userMessageLower.includes('direction')) {
      const trendEmoji = trend === 'bullish' ? '📈' : trend === 'bearish' ? '📉' : '➡️';
      smartResponse = `${trendEmoji} **Current Trend Analysis:**\n\n` +
        `The ${stockSymbol} is showing a **${trend.toUpperCase()}** trend over the ${timeFrame} timeframe.\n\n` +
        `📊 **Key Metrics:**\n` +
        `• Current Price: $${currentPrice?.toFixed(2)}\n` +
        `• Session Change: ${priceChange >= 0 ? '+' : ''}$${priceChange?.toFixed(2)} (${priceChangePercent?.toFixed(2)}%)\n` +
        `• 20-Period MA: $${ma20[ma20.length - 1]?.toFixed(2)} ${currentPrice > ma20[ma20.length - 1] ? '(Above - Bullish 🟢)' : '(Below - Bearish 🔴)'}\n` +
        `• RSI: ${rsi.toFixed(1)} ${rsi > 70 ? '(Overbought ⚠️)' : rsi < 30 ? '(Oversold 💚)' : '(Neutral 🟡)'}\n\n` +
        `⚡ **Volatility:** ${volatility.toFixed(2)}% (${volatility > 30 ? 'High' : volatility > 15 ? 'Moderate' : 'Low'})\n\n` +
        `${patterns.length > 0 ? `🎯 **Patterns Detected:** ${patterns.join(', ')}\n\n` : ''}` +
        `💡 *Need Gemini AI for deeper insights? Add your API key to .env.local*`;
        
    } else if (userMessageLower.includes('support') || userMessageLower.includes('resistance') || userMessageLower.includes('level')) {
      smartResponse = `🎯 **Support & Resistance Analysis:**\n\n` +
        `📍 **Key Levels for ${stockSymbol}:**\n` +
        `• **Support:** $${supportResistance.support[0]?.toFixed(2)} ${currentPrice > supportResistance.support[0] ? '✅ Holding Strong' : '⚠️ At Risk'}\n` +
        `• **Resistance:** $${supportResistance.resistance[0]?.toFixed(2)} ${currentPrice < supportResistance.resistance[0] ? '✅ Room to Move' : '🚨 Testing Level'}\n` +
        `• **Current:** $${currentPrice?.toFixed(2)}\n\n` +
        `📊 **Price Position:**\n` +
        `• Distance to Support: ${((currentPrice - supportResistance.support[0]) / supportResistance.support[0] * 100).toFixed(1)}%\n` +
        `• Distance to Resistance: ${((supportResistance.resistance[0] - currentPrice) / currentPrice * 100).toFixed(1)}%\n\n` +
        `🎲 **Risk Assessment:** ${supportResistance.avgPrice && currentPrice > supportResistance.avgPrice ? 'Above average price - consider profit taking' : 'Below average price - potential buying opportunity'}\n\n` +
        `💡 *Upgrade to Gemini AI for multi-timeframe level analysis!*`;
        
    } else if (userMessageLower.includes('volume') || userMessageLower.includes('activity')) {
      const volumeEmoji = volumeAnalysis.trend === 'high' ? '🔥' : volumeAnalysis.trend === 'low' ? '😴' : '📊';
      smartResponse = `${volumeEmoji} **Volume Analysis:**\n\n` +
        `📈 **Current Activity Level:** ${volumeAnalysis.trend.toUpperCase()}\n\n` +
        `📊 **Volume Metrics:**\n` +
        `• Current: ${(volumeAnalysis.currentVolume / 1000000).toFixed(1)}M shares\n` +
        `• Average: ${(volumeAnalysis.avgVolume / 1000000).toFixed(1)}M shares\n` +
        `• Vs Average: ${((volumeAnalysis.currentVolume / volumeAnalysis.avgVolume) * 100).toFixed(0)}%\n` +
        `• Recent Trend: ${volumeAnalysis.recentAvg ? ((volumeAnalysis.recentAvg / volumeAnalysis.avgVolume) * 100).toFixed(0) : '0'}% of normal\n\n` +
        `🔍 **What This Means:**\n` +
        `${volumeAnalysis.trend === 'high' ? 
          '• High volume suggests strong conviction behind price moves\n• Breakouts more likely to sustain with volume support\n• Watch for continuation or reversal signals' :
          volumeAnalysis.trend === 'low' ? 
          '• Low volume may indicate lack of conviction\n• Price moves less reliable without volume confirmation\n• Wait for volume pickup to confirm trends' :
          '• Normal volume suggests steady, healthy trading\n• Current price action is moderately supported\n• Good environment for technical analysis'}\n\n` +
        `💡 *Get sentiment analysis with Gemini AI integration!*`;
        
    } else if (userMessageLower.includes('buy') || userMessageLower.includes('sell') || userMessageLower.includes('entry') || userMessageLower.includes('exit')) {
      const signal = rsi < 30 && currentPrice < supportResistance.support[0] * 1.02 ? 'BUY' :
                    rsi > 70 && currentPrice > supportResistance.resistance[0] * 0.98 ? 'SELL' : 'HOLD';
      const signalEmoji = signal === 'BUY' ? '🟢' : signal === 'SELL' ? '🔴' : '🟡';
      
      smartResponse = `${signalEmoji} **Trading Signal Analysis:**\n\n` +
        `🎯 **Current Signal: ${signal}**\n\n` +
        `📊 **Technical Score:**\n` +
        `• RSI (${rsi.toFixed(1)}): ${rsi > 70 ? 'Overbought 🔴' : rsi < 30 ? 'Oversold 🟢' : 'Neutral 🟡'}\n` +
        `• Trend: ${trend === 'bullish' ? 'Bullish 🟢' : trend === 'bearish' ? 'Bearish 🔴' : 'Sideways 🟡'}\n` +
        `• Volume: ${volumeAnalysis.trend === 'high' ? 'Supporting 🟢' : volumeAnalysis.trend === 'low' ? 'Weak 🔴' : 'Normal 🟡'}\n` +
        `• Position vs MA20: ${currentPrice > ma20[ma20.length - 1] ? 'Above 🟢' : 'Below 🔴'}\n\n` +
        `💰 **Key Levels:**\n` +
        `• Entry Zone: $${(supportResistance.support[0] * 1.01).toFixed(2)} - $${(supportResistance.support[0] * 1.03).toFixed(2)}\n` +
        `• Stop Loss: $${(supportResistance.support[0] * 0.98).toFixed(2)}\n` +
        `• Target: $${(supportResistance.resistance[0] * 0.98).toFixed(2)}\n\n` +
        `⚠️ **Risk Disclaimer:** This is automated analysis only. Always do your own research!\n\n` +
        `🚀 *Get personalized trading strategies with Gemini AI!*`;
        
    } else {
      // General analysis
      smartResponse = `📊 **Smart Analysis for ${stockSymbol}:**\n\n` +
        `💹 **Current Status:**\n` +
        `• Price: $${currentPrice?.toFixed(2)} (${priceChange >= 0 ? '+' : ''}${priceChangePercent?.toFixed(2)}%)\n` +
        `• Trend: ${trend.toUpperCase()} ${trend === 'bullish' ? '📈' : trend === 'bearish' ? '📉' : '➡️'}\n` +
        `• RSI: ${rsi.toFixed(1)} ${rsi > 70 ? '(Overbought)' : rsi < 30 ? '(Oversold)' : '(Neutral)'}\n` +
        `• Volume: ${volumeAnalysis.trend.toUpperCase()} ${volumeAnalysis.trend === 'high' ? '🔥' : '📊'}\n\n` +
        `🎯 **Key Levels:**\n` +
        `• Support: $${supportResistance.support[0]?.toFixed(2)}\n` +
        `• Resistance: $${supportResistance.resistance[0]?.toFixed(2)}\n` +
        `• Volatility: ${volatility.toFixed(1)}%\n\n` +
        `${patterns.length > 0 ? `🔍 **Patterns:** ${patterns.join(', ')}\n\n` : ''}` +
        `💡 **Try asking:** "What's the trend?", "Find support levels", "Analyze volume", or "Should I buy?"\n\n` +
        `🚀 *Want deeper insights? Configure Gemini API key for advanced AI analysis!*`;
    }
    
    // Generate fallback chart updates if needed
    const fallbackChartUpdates: ChartAnnotation[] = [];
    const bollinger = calculateBollingerBands(stockData);
    
    return NextResponse.json({
      message: smartResponse,
      chartUpdates: fallbackChartUpdates,
      analysisData: {
        trend,
        supportResistance,
        volumeAnalysis,
        technicalIndicators: {
          ma20: ma20[ma20.length - 1],
          rsi,
          volatility,
          bollinger
        }
      },
      success: true,
      isLocal: true // Indicates this is local analysis, not Gemini
    }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "AI Analysis API is running. Send a POST request with analysis data.",
    status: "online"
  });
}