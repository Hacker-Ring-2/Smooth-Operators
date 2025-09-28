'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Line, Chart, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
// Importing all necessary icons here.
import { 
    Loader2, 
    TrendingUp, 
    Calendar, 
    Search, 
    Zap, 
    Target, 
    Minus, 
    Activity,
    Sun, // For Light Mode
    Moon, // For Dark Mode
    MessageCircle,
    Send,
    Bot,
    User,
    Minimize2,
    Maximize2,
    Pencil,
    Square,
    Circle,
    Minus as MinusIcon,
    MousePointer,
    Trash2
} from 'lucide-react'; 

// --- Chart.js Registration ---
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin
);

// --- Mocked Utility Functions (Simplified for component) ---

// AI Chat Interfaces
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const calculateSMA = (data: StockData[], period: number) => {
  return data.map((_, index) => {
    if (index < period - 1) return null;
    const sum = data.slice(index - period + 1, index + 1).reduce((acc, curr) => acc + curr.close, 0);
    return sum / period;
  });
};

const calculateEMA = (data: StockData[], period: number) => {
  const multiplier = 2 / (period + 1);
  let ema = data[0]?.close || 0;
  return data.map((entry, index) => {
    if (index === 0) return entry.close;
    ema = (entry.close * multiplier) + (ema * (1 - multiplier));
    return ema;
  });
};

// --- Enhanced Technical Indicators ---
const calculateRSI = (closePrices: number[], period: number = 14) => {
  if (closePrices.length < period + 1) return [];
  
  const rsi = [];
  let avgGain = 0;
  let avgLoss = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  
  // Calculate RSI for first period
  const rs = avgGain / (avgLoss || 0.01);
  rsi.push(100 - (100 / (1 + rs)));
  
  // Calculate subsequent RSI values
  for (let i = period + 1; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    const newRs = avgGain / (avgLoss || 0.01);
    rsi.push(100 - (100 / (1 + newRs)));
  }
  
  return Array(period).fill(null).concat(rsi);
};

// Calculate Volatility (Standard Deviation of Daily Returns)
const calculateVolatility = (data: StockData[]) => {
  if (data.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < data.length; i++) {
    const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
    returns.push(dailyReturn);
  }
  
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance * 252) * 100; // Annualized volatility as percentage
};

// Calculate Daily Returns
const calculateDailyReturns = (data: StockData[]) => {
  const returns: (number | null)[] = [null]; // First day has no return
  for (let i = 1; i < data.length; i++) {
    const dailyReturn = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;
    returns.push(dailyReturn);
  }
  return returns;
};

// Calculate Sharpe Ratio (Risk-adjusted performance)
const calculateSharpeRatio = (data: StockData[], riskFreeRate: number = 0.02) => {
  if (data.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < data.length; i++) {
    const dailyReturn = (data[i].close - data[i - 1].close) / data[i - 1].close;
    returns.push(dailyReturn);
  }
  
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const annualizedReturn = avgReturn * 252; // Annualized
  
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 252);
  
  return volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
};

// Calculate Price Changes
const calculatePriceChange = (data: StockData[], period: number = 1) => {
  if (data.length < period + 1) return { change: 0, changePercent: 0 };
  
  const current = data[data.length - 1].close;
  const previous = data[data.length - 1 - period].close;
  const change = current - previous;
  const changePercent = (change / previous) * 100;
  
  return { change, changePercent };
};

const calculateBollingerBands = (data: StockData[], period: number = 20, numStdDev: number = 2) => {
  // Mocked BBands calculation
  const sma = calculateSMA(data, period);
  
  const stdDevs = data.map((_, index) => {
    if (index < period - 1) return 0;
    const periodPrices = data.slice(index - period + 1, index + 1).map(d => d.close);
    const mean = sma[index] || 0;
    const squaredDifferences = periodPrices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / period;
    return Math.sqrt(variance);
  });
  
  return {
    upper: sma.map((s, index) => s ? s + (stdDevs[index] * numStdDev) : null),
    middle: sma,
    lower: sma.map((s, index) => s ? s - (stdDevs[index] * numStdDev) : null),
  };
};

// --- End Mocked Utility Functions ---


interface ApiResponse {
  symbol: string;
  period: string;
  interval: string;
  data: StockData[];
}

const TechnicalAnalysisPage = () => {
  const [stockData, setStockData] = useState<StockData[] | null>(null);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('1mo');
  const [stockSymbol, setStockSymbol] = useState('AAPL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputSymbol, setInputSymbol] = useState('AAPL');
  // Removed 'ohlc' option from state
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('candlestick'); 
  const [showRSI, setShowRSI] = useState(true);
  const [showBollingerBands, setShowBollingerBands] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [maType, setMaType] = useState<'sma' | 'ema'>('sma');
  const [maPeriod, setMaPeriod] = useState(20);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const chartRef = useRef<any>(null);

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>([]);
  const [drawingMode, setDrawingMode] = useState<'none' | 'trendline' | 'support' | 'resistance' | 'point' | 'rectangle' | 'circle'>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{ points: { x: number; y: number }[] } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  
  // Drawing refs
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Theme colors
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#111827' : '#f9fafb';
  const cardColor = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const textColor = isDark ? '#ffffff' : '#1f2937';
  const secondaryTextColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  // Time frame options with better labels and intervals
  const timeFrameOptions = [
    { value: '1d', label: '1 Day', interval: '5m' },
    { value: '5d', label: '5 Days', interval: '15m' },
    { value: '1mo', label: '1 Month', interval: '1d' },
    { value: '3mo', label: '3 Months', interval: '1d' },
    { value: '6mo', label: '6 Months', interval: '1d' },
    { value: '1y', label: '1 Year', interval: '1wk' },
    { value: '2y', label: '2 Years', interval: '1wk' },
    { value: '5y', label: '5 Years', interval: '1mo' },
  ];

  // Generate mock stock data for demonstration
  const generateMockData = (symbol: string, timeFrame: string): StockData[] => {
    const now = new Date();
    const dataPoints = timeFrame === '1d' ? 50 : timeFrame === '5d' ? 120 : timeFrame.includes('mo') ? 60 : timeFrame.includes('y') ? 250 : 100;
    const basePrice = 150 + Math.random() * 100; 
    const mockData: StockData[] = [];

    for (let i = dataPoints; i >= 0; i--) {
      const date = new Date(now);
      if (timeFrame === '1d') {
        date.setHours(date.getHours() - i);
      } else if (timeFrame === '5d') {
        date.setHours(date.getHours() - i * 4); // Simulate 4-hour intervals
      } else {
        date.setDate(date.getDate() - i);
      }

      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      const price = Math.max(basePrice * (1 + change * i * 0.001), 1);
      
      const open = price * (1 + (Math.random() - 0.5) * 0.01);
      const high = price * (1.001 + Math.random() * 0.015);
      const low = price * (0.99 - Math.random() * 0.015);
      const close = price * (1 + (Math.random() - 0.5) * 0.01);
      
      mockData.push({
        date: date.toISOString(),
        open: Math.max(open, low), 
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close: Math.max(close, low),
        volume: Math.floor(1000000 + Math.random() * 5000000)
      });
    }

    return mockData.reverse(); 
  };

  // Fetch real stock data from backend API
  const fetchStockData = async (symbol: string, timeFrame: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Clean the symbol
      const cleanSymbol = symbol.trim().toUpperCase();
      
      if (!cleanSymbol) {
        throw new Error('Please enter a valid stock symbol');
      }

      const timeFrameOption = timeFrameOptions.find(opt => opt.value === timeFrame);
      const interval = timeFrameOption?.interval || '1d';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `http://localhost:8000/api/stocks/historical/${cleanSymbol}?period=${timeFrame}&interval=${interval}`,
        { 
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Invalid stock symbol: ${cleanSymbol}`);
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Failed to fetch data for ${cleanSymbol}`);
        }
      }
      
      const result: ApiResponse = await response.json();
      
      if (!result.data || result.data.length === 0) {
        throw new Error(`No data available for ${cleanSymbol}`);
      }
      
      setStockData(result.data);
      setError(null);
      
    } catch (error: any) {
      console.error('Error fetching stock data:', error);
      
      if (error.name === 'AbortError') {
        setError('Request timeout. Please check your connection and try again.');
      } else if (error.message.includes('Invalid stock symbol') || error.message.includes('No data')) {
        setError(error.message);
      } else if (error.message.includes('fetch')) {
        setError('Unable to connect to server. Please ensure the backend is running.');
      } else {
        setError(error.message || 'Failed to fetch stock data');
      }
      
      // Clear any previous data on error
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData(stockSymbol, selectedTimeFrame);
  }, [stockSymbol, selectedTimeFrame]);

  // Handle symbol search
  const handleSymbolSearch = () => {
    const symbol = inputSymbol.trim().toUpperCase();
    if (symbol && symbol !== stockSymbol) {
      setStockSymbol(symbol);
    }
  };

  // Handle Enter key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSymbolSearch();
    }
  };

  // Chart Click Handler for 2-Point Drawing
  const handleChartClick = (event: any, elements: any, chart: any) => {
    if (drawingMode === 'none') return;

    // Get the event's native event for accurate coordinates
    const nativeEvent = event.native || event;
    
    // Get canvas bounds
    const canvasPosition = chart.canvas.getBoundingClientRect();
    
    // Calculate relative position within the chart area
    const x = nativeEvent.clientX - canvasPosition.left;
    const y = nativeEvent.clientY - canvasPosition.top;
    
    // Get chart area bounds to ensure click is within drawable area
    const chartArea = chart.chartArea;
    if (x < chartArea.left || x > chartArea.right || y < chartArea.top || y > chartArea.bottom) {
      console.log('Click outside chart area, ignoring');
      return;
    }
    
    // Use Chart.js scales for accurate coordinate conversion
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    
    // For category scale (dates), get the index
    let dataX, dataY;
    
    if (xScale.type === 'category') {
      // For category scale, convert pixel to data index
      dataX = Math.round(xScale.getValueForPixel(x));
      // Clamp to valid range
      dataX = Math.max(0, Math.min(dataX, chartLabels.length - 1));
    } else {
      dataX = xScale.getValueForPixel(x);
    }
    
    dataY = yScale.getValueForPixel(y);

    console.log('Chart clicked (fixed coordinates):', { 
      pixelX: x, 
      pixelY: y, 
      dataX, 
      dataY,
      xScaleType: xScale.type,
      chartAreaLeft: chartArea.left,
      chartAreaRight: chartArea.right,
      chartLabelsLength: chartLabels.length,
      actualLabel: chartLabels[dataX],
      drawingMode, 
      isDrawing 
    });

    if (drawingMode === 'trendline') {
      if (!isDrawing) {
        // First point
        setIsDrawing(true);
        setCurrentDrawing({ points: [{ x: Math.round(dataX), y: dataY }] });
        console.log('First point set:', { x: Math.round(dataX), y: dataY });
      } else {
        // Second point - complete the drawing
        if (currentDrawing) {
          const secondPoint = { x: Math.round(dataX), y: dataY };
          
          // Validate coordinates before creating annotation
          if (isNaN(dataX) || isNaN(dataY) || isNaN(currentDrawing.points[0].x) || isNaN(currentDrawing.points[0].y)) {
            console.error('Invalid coordinates detected:', {
              firstPoint: currentDrawing.points[0],
              secondPoint,
              dataX,
              dataY
            });
            alert('Invalid coordinates detected. Please try clicking directly on the chart data area.');
            setIsDrawing(false);
            setCurrentDrawing(null);
            setDrawingMode('none');
            return;
          }
          
          const newAnnotation: ChartAnnotation = {
            id: `line-${Date.now()}`,
            type: 'trendline',
            points: [
              currentDrawing.points[0],
              secondPoint
            ],
            color: '#10b981',
            label: `Line ${annotations.length + 1}`,
            visible: true,
            aiGenerated: false
          };
          
          console.log('New annotation created:', newAnnotation);
          
          setAnnotations(prev => {
            const updated = [...prev, newAnnotation];
            console.log('Updated annotations array:', updated);
            return updated;
          });
          
          setIsDrawing(false);
          setCurrentDrawing(null);
          setDrawingMode('none');
          
          // Auto-generate AI analysis for the line with proper price validation
          const startPrice = currentDrawing.points[0].y;
          const endPrice = dataY;
          
          console.log('Price values:', { startPrice, endPrice });
          
          // Ensure valid price values
          const startPriceStr = (isNaN(startPrice) || startPrice === null || startPrice === undefined) ? 'Unknown' : startPrice.toFixed(2);
          const endPriceStr = (isNaN(endPrice) || endPrice === null || endPrice === undefined) ? 'Unknown' : endPrice.toFixed(2);
          
          const analysisMessage = `Analyze the trendline I just drew between $${startPriceStr} and $${endPriceStr}`;
          console.log('Sending analysis message:', analysisMessage);
          sendChatMessage(analysisMessage);
        }
      }
    }
  };

  // API Test Function
  const testAPIConnection = async () => {
    try {
      console.log("🧪 Testing API connection...");
      
      // Test GET endpoint first
      const getResponse = await fetch('/api/ai/analyze');
      console.log("GET Response status:", getResponse.status);
      const getResult = await getResponse.json();
      console.log("GET Result:", getResult);
      
      // Test POST endpoint with minimal data
      const testData = {
        message: "test",
        stockData: stockData || [],
        stockSymbol: stockSymbol || "TEST",
        timeFrame: "1d",
        annotations: [],
        chartType: "candlestick",
        technicalContext: {
          currentPrice: 100,
          volatility: 20,
          rsi: [],
          priceChange: 0
        }
      };
      
      console.log("🚀 Sending test POST request...");
      const postResponse = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });
      
      console.log("POST Response status:", postResponse.status);
      console.log("POST Response ok:", postResponse.ok);
      
      if (postResponse.ok) {
        const postResult = await postResponse.json();
        console.log("✅ POST Result:", postResult);
        return "✅ API Connection Test Successful!";
      } else {
        const errorText = await postResponse.text();
        console.error("❌ POST Error:", errorText);
        return `❌ API Test Failed: ${postResponse.status} ${postResponse.statusText}`;
      }
    } catch (error) {
      console.error("🚨 API Test Error:", error);
      return `🚨 API Test Error: ${error}`;
    }
  };

  // AI Chat Functions
  const sendChatMessage = async (message: string) => {
    if (!message.trim()) return;
    
    // Handle API test
    if (message === "Test API Connection") {
      const testResult = await testAPIConnection();
      
      const testMessage: ChatMessage = {
        id: `test-${Date.now()}`,
        text: testResult,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        text: message,
        sender: 'user',
        timestamp: new Date()
      }, testMessage]);
      setCurrentMessage('');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAITyping(true);

    try {
      // Prepare enhanced request body with comprehensive smart context
      const currentPrice = stockData?.[stockData.length - 1]?.close || 0;
      const volatility = stockData ? calculateVolatility(stockData) : 0;
      const rsi = stockData ? calculateRSI(stockData.map(d => d.close)) : [];
      const ma20 = stockData ? calculateMA(stockData.map(d => d.close), 20) : [];
      
      // Enhanced technical analysis for smarter responses
      const technicalAnalysis = {
        trend: stockData && stockData.length > 5 ? analyzeTrend(stockData) : 'unknown',
        volatility: volatility,
        rsi: rsi[rsi.length - 1] || 50,
        maSignal: currentPrice > (ma20[ma20.length - 1] || 0) ? 'bullish' : 'bearish',
        priceAction: stockData && stockData.length > 1 ? 
          ((stockData[stockData.length - 1].close - stockData[stockData.length - 2].close) / stockData[stockData.length - 2].close * 100) : 0,
        volumeTrend: stockData && stockData.length > 5 ? analyzeVolumeTrend(stockData) : 'normal',
        supportResistance: stockData ? findKeyLevels(stockData) : { support: 0, resistance: 0 }
      };

      // Smart message processing - enhance user queries
      const enhancedMessage = enhanceUserQuery(message, technicalAnalysis, annotations);
      
      const requestBody = {
        message: enhancedMessage,
        originalMessage: message,
        stockData: stockData || [],
        stockSymbol,
        timeFrame: selectedTimeFrame,
        annotations,
        chartType,
        // Enhanced technical context for smarter analysis
        technicalContext: {
          currentPrice,
          volatility,
          rsi: rsi[rsi.length - 1] || 50,
          ma20: ma20[ma20.length - 1] || 0,
          priceChange: stockData && stockData.length > 0 ? 
            ((stockData[stockData.length - 1].close - stockData[0].open) / stockData[0].open * 100) : 0,
          technicalAnalysis,
          marketContext: {
            trend: technicalAnalysis.trend,
            strength: Math.abs(technicalAnalysis.priceAction) > 2 ? 'strong' : 'weak',
            momentum: technicalAnalysis.rsi > 70 ? 'overbought' : technicalAnalysis.rsi < 30 ? 'oversold' : 'neutral',
            volume: technicalAnalysis.volumeTrend
          }
        }
      };
      
      console.log("🚀 Enhanced request body being sent to backend:", requestBody);
      console.log("📊 Annotations being sent:", annotations);
      console.log("📈 Technical context:", requestBody.technicalContext);
      console.log("🎯 Message being analyzed:", message);
      console.log("🔍 Message includes 'trendline'?", message.toLowerCase().includes('trendline'));
      console.log("🔍 Message includes 'analyze the'?", message.toLowerCase().includes('analyze the'));
      console.log("🔍 Annotations count:", annotations?.length || 0);
      
      // Send to AI API
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);
      console.log("Response ok:", response.ok);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      console.log("Content-Type:", contentType);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response text:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      if (!contentType?.includes('application/json')) {
        const responseText = await response.text();
        console.error("Non-JSON response received:", responseText.substring(0, 500));
        throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 200)}...`);
      }
      
      const result = await response.json();
      console.log("Backend response:", result);
      
      // Add AI response
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: result.message || 'Sorry, I couldn\'t process your request.',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);

      // Update chart with AI annotations if provided
      if (result.chartUpdates && result.chartUpdates.length > 0) {
        console.log("Received chart updates from backend:", result.chartUpdates);
        setAnnotations(prev => {
          const updated = [...prev, ...result.chartUpdates];
          console.log("Updated annotations with AI responses:", updated);
          return updated;
        });
      }

    } catch (error) {
      console.error('🚨 AI Chat Error:', error);
      
      // Determine error type and provide appropriate fallback
      let fallbackText = "";
      
      if (error instanceof Error) {
        if (error.message.includes('JSON') || error.message.includes('<!DOCTYPE')) {
          fallbackText = `🔧 **API Connection Issue Detected**

The backend API is returning HTML instead of JSON. This usually means:

**🚨 Possible Causes:**
• Next.js development server needs restart
• API route has compilation errors  
• Wrong API endpoint URL
• CORS or network issues

**🛠 Quick Fixes:**
1. **Restart Dev Server**: Stop and restart \`npm run dev\`
2. **Check Console**: Look for API compilation errors
3. **Test API**: Use the "Test API Connection" button
4. **Fallback Analysis**: I'll provide local analysis below

---

${generateFallbackAIResponse(message)}`;
        } else if (error.message.includes('fetch')) {
          fallbackText = `🌐 **Network Connection Issue**

Unable to reach the AI analysis API. Using local fallback analysis:

${generateFallbackAIResponse(message)}`;
        } else {
          fallbackText = `🤖 **AI Trading Assistant for ${stockSymbol}**

**Quick Analysis:**
• Price: ${stockData?.length > 0 ? `$${stockData[stockData.length - 1]?.close?.toFixed(2)}` : 'Loading...'}
• Active Annotations: ${annotations.length}

**Market Insight:**
The AI is processing market data to provide you with comprehensive analysis.

**Pro Tip:** Draw on the chart and ask me to analyze your annotations for deeper insights!

*AI analysis ready - Enhanced features available*`;
        }
      } else {
        fallbackText = generateFallbackAIResponse(message);
      }
      
      const fallbackMessage: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        text: fallbackText,
        sender: 'ai',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  // Drawing Functions
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode === 'none') return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentDrawing({ points: [{ x, y }] });
  };

  const continueDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentDrawing) return;
    
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (drawingMode === 'trendline' || drawingMode === 'support' || drawingMode === 'resistance') {
      setCurrentDrawing({ points: [currentDrawing.points[0], { x, y }] });
    } else if (drawingMode === 'rectangle') {
      const startPoint = currentDrawing.points[0];
      setCurrentDrawing({ 
        points: [
          startPoint,
          { x: startPoint.x, y },
          { x, y },
          { x, y: startPoint.y }
        ] 
      });
    }
  };

  const finishDrawing = () => {
    if (!currentDrawing || !isDrawing) return;
    
    const newAnnotation: ChartAnnotation = {
      id: `annotation-${Date.now()}`,
      type: drawingMode as any,
      points: currentDrawing.points,
      color: drawingMode === 'support' ? '#ef4444' : drawingMode === 'resistance' ? '#22c55e' : '#3b82f6',
      label: `${drawingMode.charAt(0).toUpperCase() + drawingMode.slice(1)}`,
      visible: true,
      aiGenerated: false
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setCurrentDrawing(null);
    setIsDrawing(false);
    setDrawingMode('none');
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
  };

  // Enhanced Smart Analysis Functions
  const calculateMA = (prices: number[], period: number): number[] => {
    const ma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ma.push(0);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        ma.push(sum / period);
      }
    }
    return ma;
  };

  const analyzeTrend = (data: StockData[]): string => {
    if (!data || data.length < 5) return 'unknown';
    
    const prices = data.slice(-10).map(d => d.close);
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (change > 2) return 'strong_bullish';
    if (change > 0.5) return 'bullish';
    if (change < -2) return 'strong_bearish';
    if (change < -0.5) return 'bearish';
    return 'sideways';
  };

  const analyzeVolumeTrend = (data: StockData[]): string => {
    if (!data || data.length < 5) return 'normal';
    
    const recentVolume = data.slice(-5).reduce((sum, d) => sum + d.volume, 0) / 5;
    const averageVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
    
    const ratio = recentVolume / averageVolume;
    
    if (ratio > 1.5) return 'high';
    if (ratio < 0.7) return 'low';
    return 'normal';
  };

  const findKeyLevels = (data: StockData[]) => {
    if (!data || data.length < 10) return { support: 0, resistance: 0 };
    
    const recent = data.slice(-20);
    const lows = recent.map(d => d.low);
    const highs = recent.map(d => d.high);
    
    const support = lows.sort((a, b) => a - b)[Math.floor(lows.length * 0.2)];
    const resistance = highs.sort((a, b) => b - a)[Math.floor(highs.length * 0.2)];
    
    return { support, resistance };
  };

  const enhanceUserQuery = (message: string, analysis: any, annotations: ChartAnnotation[]): string => {
    const messageLower = message.toLowerCase();
    
    // Add context to simple queries
    if (messageLower.includes('trend') && !messageLower.includes('analysis')) {
      return `${message} - Current trend is ${analysis.trend} with ${analysis.strength} momentum. RSI: ${analysis.rsi.toFixed(1)}`;
    }
    
    if (messageLower.includes('support') && annotations.length > 0) {
      const lastAnnotation = annotations[annotations.length - 1];
      if (lastAnnotation.points && lastAnnotation.points.length >= 2) {
        const avgPrice = (lastAnnotation.points[0].y + lastAnnotation.points[1].y) / 2;
        return `${message} - Analyzing trendline at $${avgPrice.toFixed(2)} with current price at $${analysis.currentPrice.toFixed(2)}`;
      }
    }
    
    if (messageLower.includes('resistance') && annotations.length > 0) {
      const lastAnnotation = annotations[annotations.length - 1];
      if (lastAnnotation.points && lastAnnotation.points.length >= 2) {
        const avgPrice = (lastAnnotation.points[0].y + lastAnnotation.points[1].y) / 2;
        return `${message} - Analyzing resistance at $${avgPrice.toFixed(2)} with current price at $${analysis.currentPrice.toFixed(2)}`;
      }
    }
    
    // Add technical context to generic queries
    if (messageLower === "what's the trend?" || messageLower === "analyze rsi" || messageLower === "check volume") {
      return `${message} - Context: ${analysis.trend} trend, RSI ${analysis.rsi.toFixed(1)}, volume ${analysis.volumeTrend}`;
    }
    
    return message;
  };

  // Support/Resistance Analysis Functions
  const findSupportResistanceLevels = (data: StockData[]) => {
    if (!data || data.length < 5) return { supports: [], resistances: [] };
    
    const supports: number[] = [];
    const resistances: number[] = [];
    const lookback = 5; // periods to look back/forward for pivots
    
    for (let i = lookback; i < data.length - lookback; i++) {
      const current = data[i];
      const isLow = data.slice(i - lookback, i + lookback + 1)
        .every(d => d.low >= current.low);
      const isHigh = data.slice(i - lookback, i + lookback + 1)
        .every(d => d.high <= current.high);
      
      if (isLow) supports.push(current.low);
      if (isHigh) resistances.push(current.high);
    }
    
    return { supports, resistances };
  };

  const validateSupportLevel = (trendlinePrice: number, stockData: StockData[]) => {
    const { supports } = findSupportResistanceLevels(stockData);
    const tolerance = 0.02; // 2% tolerance
    
    // Find closest support level
    const closestSupport = supports.reduce((closest, level) => {
      const currentDistance = Math.abs(level - trendlinePrice);
      const closestDistance = Math.abs(closest - trendlinePrice);
      return currentDistance < closestDistance ? level : closest;
    }, supports[0] || 0);
    
    const distancePercent = Math.abs(closestSupport - trendlinePrice) / trendlinePrice * 100;
    const isValid = distancePercent <= (tolerance * 100);
    
    // Count bounces from this level
    const bounces = stockData.filter(d => 
      Math.abs(d.low - trendlinePrice) / trendlinePrice <= tolerance
    ).length;
    
    // Check recent price behavior around this level
    const recentData = stockData.slice(-20);
    const touchesLevel = recentData.filter(d => 
      Math.abs(d.low - trendlinePrice) / trendlinePrice <= tolerance
    ).length;
    
    return {
      isValid,
      closestSupport,
      distancePercent,
      bounces,
      recentTouches: touchesLevel,
      strength: bounces >= 2 ? 'Strong' : bounces >= 1 ? 'Moderate' : 'Weak'
    };
  };

  const validateResistanceLevel = (trendlinePrice: number, stockData: StockData[]) => {
    const { resistances } = findSupportResistanceLevels(stockData);
    const tolerance = 0.02; // 2% tolerance
    
    // Find closest resistance level
    const closestResistance = resistances.reduce((closest, level) => {
      const currentDistance = Math.abs(level - trendlinePrice);
      const closestDistance = Math.abs(closest - trendlinePrice);
      return currentDistance < closestDistance ? level : closest;
    }, resistances[0] || 0);
    
    const distancePercent = Math.abs(closestResistance - trendlinePrice) / trendlinePrice * 100;
    const isValid = distancePercent <= (tolerance * 100);
    
    // Count rejections from this level
    const rejections = stockData.filter(d => 
      Math.abs(d.high - trendlinePrice) / trendlinePrice <= tolerance
    ).length;
    
    // Check recent price behavior around this level
    const recentData = stockData.slice(-20);
    const touchesLevel = recentData.filter(d => 
      Math.abs(d.high - trendlinePrice) / trendlinePrice <= tolerance
    ).length;
    
    return {
      isValid,
      closestResistance,
      distancePercent,
      rejections,
      recentTouches: touchesLevel,
      strength: rejections >= 2 ? 'Strong' : rejections >= 1 ? 'Moderate' : 'Weak'
    };
  };

  const analyzeTrendlineValidity = (trendlinePoints: {x: number, y: number}[], stockData: StockData[], message: string) => {
    if (!trendlinePoints || trendlinePoints.length < 2) return null;
    
    const [start, end] = trendlinePoints;
    const avgPrice = (start.y + end.y) / 2;
    const currentPrice = stockData[stockData.length - 1]?.close || 0;
    const messageLower = message.toLowerCase();
    
    // Determine if user is asking about support or resistance
    const isCheckingSupport = messageLower.includes('support') || avgPrice < currentPrice;
    const isCheckingResistance = messageLower.includes('resistance') || avgPrice > currentPrice;
    
    let analysis = '';
    
    if (isCheckingSupport) {
      const supportAnalysis = validateSupportLevel(avgPrice, stockData);
      analysis = `🔍 **Support Level Analysis:**

**Trendline Level:** $${avgPrice.toFixed(2)}
**Validity:** ${supportAnalysis.isValid ? '✅ VALID SUPPORT' : '❌ NOT A VALID SUPPORT'}

**📊 Analysis Details:**
• **Closest Historical Support:** $${supportAnalysis.closestSupport?.toFixed(2) || 'N/A'}
• **Distance from Historical:** ${supportAnalysis.distancePercent.toFixed(1)}% ${supportAnalysis.distancePercent <= 2 ? '(Very Close ✅)' : supportAnalysis.distancePercent <= 5 ? '(Moderately Close ⚠️)' : '(Too Far ❌)'}
• **Historical Bounces:** ${supportAnalysis.bounces} times
• **Recent Touches:** ${supportAnalysis.recentTouches} in last 20 periods
• **Support Strength:** ${supportAnalysis.strength} ${supportAnalysis.strength === 'Strong' ? '💪' : supportAnalysis.strength === 'Moderate' ? '⚡' : '📉'}

**🎯 Conclusion:**
${supportAnalysis.isValid ? 
  `This trendline IS at a valid support level! The price has ${supportAnalysis.bounces > 0 ? `bounced off this level ${supportAnalysis.bounces} times` : 'shown support characteristics'} historically. This level is likely to ${supportAnalysis.strength === 'Strong' ? 'provide strong support' : 'offer some support'} in future price movements.` :
  `This trendline is NOT at a valid support level. The nearest actual support is at $${supportAnalysis.closestSupport?.toFixed(2)} (${supportAnalysis.distancePercent.toFixed(1)}% away). Consider drawing your trendline closer to historical support zones for more accurate analysis.`
}`;
    } else if (isCheckingResistance) {
      const resistanceAnalysis = validateResistanceLevel(avgPrice, stockData);
      analysis = `🔍 **Resistance Level Analysis:**

**Trendline Level:** $${avgPrice.toFixed(2)}
**Validity:** ${resistanceAnalysis.isValid ? '✅ VALID RESISTANCE' : '❌ NOT A VALID RESISTANCE'}

**📊 Analysis Details:**
• **Closest Historical Resistance:** $${resistanceAnalysis.closestResistance?.toFixed(2) || 'N/A'}
• **Distance from Historical:** ${resistanceAnalysis.distancePercent.toFixed(1)}% ${resistanceAnalysis.distancePercent <= 2 ? '(Very Close ✅)' : resistanceAnalysis.distancePercent <= 5 ? '(Moderately Close ⚠️)' : '(Too Far ❌)'}
• **Historical Rejections:** ${resistanceAnalysis.rejections} times
• **Recent Touches:** ${resistanceAnalysis.recentTouches} in last 20 periods
• **Resistance Strength:** ${resistanceAnalysis.strength} ${resistanceAnalysis.strength === 'Strong' ? '💪' : resistanceAnalysis.strength === 'Moderate' ? '⚡' : '📈'}

**🎯 Conclusion:**
${resistanceAnalysis.isValid ? 
  `This trendline IS at a valid resistance level! The price has ${resistanceAnalysis.rejections > 0 ? `been rejected from this level ${resistanceAnalysis.rejections} times` : 'shown resistance characteristics'} historically. This level is likely to ${resistanceAnalysis.strength === 'Strong' ? 'provide strong resistance' : 'offer some resistance'} to upward price movements.` :
  `This trendline is NOT at a valid resistance level. The nearest actual resistance is at $${resistanceAnalysis.closestResistance?.toFixed(2)} (${resistanceAnalysis.distancePercent.toFixed(1)}% away). Consider drawing your trendline closer to historical resistance zones for more accurate analysis.`
}`;
    }
    
    return analysis;
  };

  // Generate intelligent fallback AI response with technical analysis
  const generateFallbackAIResponse = (message: string): string => {
    const messageLower = message.toLowerCase();
    
    if (!stockData) {
      return "Please load some stock data first, then I can help analyze it for you! 📊";
    }

    // Handle support/resistance validation questions
    if ((messageLower.includes('support') || messageLower.includes('resistance') || 
         messageLower.includes('valid') || messageLower.includes('level')) && annotations.length > 0) {
      
      const latestAnnotation = annotations[annotations.length - 1];
      if (latestAnnotation.points && latestAnnotation.points.length >= 2) {
        const validationResult = analyzeTrendlineValidity(latestAnnotation.points, stockData, message);
        if (validationResult) {
          return validationResult;
        }
      }
    }

    // Handle 2-point trendline analysis with enhanced logging
    if ((messageLower.includes('analyze the trendline') || messageLower.includes('analyze my trendline')) && annotations.length > 0) {
      console.log("Processing trendline analysis for annotations:", annotations);
      
      const latestAnnotation = annotations[annotations.length - 1];
      console.log("Latest annotation for analysis:", latestAnnotation);
      
      if (latestAnnotation.points && latestAnnotation.points.length >= 2) {
        const [start, end] = latestAnnotation.points;
        const startPrice = start.y;
        const endPrice = end.y;
        
        console.log("Raw annotation points:", { start, end, startPrice, endPrice });
        
        // Validate price values
        if (isNaN(startPrice) || isNaN(endPrice) || startPrice === null || endPrice === null) {
          return `⚠️ **Trendline Analysis Error:**
          
**Issue:** Unable to analyze the drawn line due to invalid coordinates.
**Possible causes:** 
• Chart scaling issues
• Coordinate conversion problems
• Data not loaded properly

**Debug Info:** 
• Start Price: ${startPrice}
• End Price: ${endPrice}
• Chart has ${stockData?.length || 0} data points

**Try:** Refresh the page and ensure stock data is loaded before drawing.`;
        }
        
        const priceChange = endPrice - startPrice;
        const priceChangePercent = (priceChange / startPrice) * 100;
        const currentPrice = stockData[stockData.length - 1]?.close || 0;
        
        console.log("Trendline analysis data:", {
          startPrice,
          endPrice,
          priceChange,
          priceChangePercent,
          currentPrice
        });
        
        const isUpward = priceChange > 0;
        const trendStrength = Math.abs(priceChangePercent) > 5 ? 'Strong' : Math.abs(priceChangePercent) > 2 ? 'Moderate' : 'Weak';
        
        // Calculate additional metrics
        const priceRange = Math.abs(priceChange);
        const daysBetween = Math.abs(end.x - start.x);
        const dailyChangeRate = daysBetween > 0 ? (priceChangePercent / daysBetween) : 0;
        const volatility = stockData ? calculateVolatility(stockData) : 0;
        const rsi = calculateRSI(stockData.map(d => d.close));
        const latestRSI = rsi[rsi.length - 1] || 50;
        
        // Determine trend strength based on multiple factors
        let trendStrengthScore = 0;
        if (Math.abs(priceChangePercent) > 5) trendStrengthScore += 2;
        else if (Math.abs(priceChangePercent) > 2) trendStrengthScore += 1;
        if (Math.abs(dailyChangeRate) > 1) trendStrengthScore += 1;
        if (priceRange > currentPrice * 0.02) trendStrengthScore += 1;
        
        const trendStrengthText = trendStrengthScore >= 3 ? 'Very Strong 🔥' : 
                                 trendStrengthScore >= 2 ? 'Strong 💪' : 
                                 trendStrengthScore >= 1 ? 'Moderate ⚡' : 'Weak 📉';
        
        return `📈 **Smart Trendline Analysis: ${stockSymbol}**

**🎯 Your Line Overview:**
• **Start:** $${startPrice.toFixed(2)} → **End:** $${endPrice.toFixed(2)}
• **Move:** ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)} (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)
• **Timespan:** ${daysBetween} data points
• **Daily Rate:** ${dailyChangeRate.toFixed(2)}% per period

**📊 Technical Assessment:**
• **Direction:** ${isUpward ? '🟢 BULLISH Trajectory' : '🔴 BEARISH Trajectory'}
• **Strength:** ${trendStrengthText}
• **Current Price:** $${currentPrice.toFixed(2)} ${currentPrice > Math.max(startPrice, endPrice) ? '📈 Above your trendline' : currentPrice < Math.min(startPrice, endPrice) ? '📉 Below your trendline' : '🎯 Near your trendline'}

**🧠 Market Context:**
• **RSI:** ${latestRSI.toFixed(1)} ${latestRSI > 70 ? '(Overbought Zone ⚠️)' : latestRSI < 30 ? '(Oversold Zone 💚)' : '(Neutral Zone 🟡)'}
• **Volatility:** ${volatility.toFixed(1)}% ${volatility > 25 ? '(High Risk)' : volatility > 15 ? '(Moderate)' : '(Low Risk)'}

**� Trading Insights:**
${isUpward ? 
  `🚀 **BULLISH SCENARIO:**
• Your line suggests upward momentum
• Price moving from $${startPrice.toFixed(2)} to $${endPrice.toFixed(2)}
• ${priceChangePercent > 3 ? 'Strong bullish signal - Consider buying dips' : priceChangePercent > 1 ? 'Moderate uptrend - Watch for continuation' : 'Weak uptrend - Need confirmation'}
• **Support Level:** Around $${Math.min(startPrice, endPrice).toFixed(2)}
• **Target:** Next resistance near $${(Math.max(startPrice, endPrice) + priceRange).toFixed(2)}` :
  `⚠️ **BEARISH SCENARIO:**
• Your line shows downward pressure  
• Price declining from $${startPrice.toFixed(2)} to $${endPrice.toFixed(2)}
• ${Math.abs(priceChangePercent) > 3 ? 'Strong bearish signal - Consider protective stops' : Math.abs(priceChangePercent) > 1 ? 'Moderate downtrend - Watch for breakdown' : 'Weak downtrend - Could reverse'}
• **Resistance Level:** Around $${Math.max(startPrice, endPrice).toFixed(2)}
• **Support:** Next level near $${(Math.min(startPrice, endPrice) - priceRange).toFixed(2)}`
}

**⚡ Action Plan:**
${priceChangePercent > 2 ? '✅ Strong uptrend - Look for pullbacks to buy' :
  priceChangePercent < -2 ? '🛑 Strong downtrend - Consider profit taking or stops' :
  Math.abs(priceChangePercent) < 1 ? '📊 Consolidation - Wait for breakout direction' :
  '👀 Developing trend - Monitor for continuation'}

**🎪 Pro Tip:** ${isUpward ? 'If price breaks above your line with volume, it could accelerate higher!' : 'If price breaks below your line with volume, expect further decline!'}`;
      }
    }

    // Rest of the fallback responses...
    const currentPrice = stockData[stockData.length - 1]?.close;
    const previousPrice = stockData[0]?.close;
    const change = ((currentPrice - previousPrice) / previousPrice * 100);
    
    return `🤖 **AI Trading Assistant for ${stockSymbol}**

**Quick Analysis:**
• Price: $${currentPrice?.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)
• Active Annotations: ${annotations.length}

**Pro Tip:** Draw on the chart and ask me to analyze your annotations!

*For advanced AI analysis, configure your backend API endpoint*`;
  };

  // Calculate all technical indicators

  // Calculate indicators once data is available
  const closePrices = stockData ? stockData.map(d => d.close) : [];
  const rsiData = showRSI ? calculateRSI(closePrices) : [];
  const bbands = showBollingerBands && stockData ? calculateBollingerBands(stockData) : { upper: [], middle: [], lower: [] };
  
  // Convert date strings to Date objects for Chart.js (TimeScale is not available)
  // We'll use CategoryScale and treat the dates as labels for compatibility.
  const chartLabels = stockData?.map(entry => new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })) || [];

  // Prepare main price chart data
  const chartDatasets = [
    // --- Main Price Chart (Candlestick or Line) ---
    ...(chartType === 'candlestick' ? [{
      // Use Bar chart as base for custom financial drawing
      type: 'bar' as const, 
      label: `${stockSymbol} Price Range`,
      data: stockData?.map(entry => ({
        // Use the middle point (high+low)/2 for the bar chart's Y value to help scaling
        y: (entry.high + entry.low) / 2, 
      })) || [],
      // The custom rendering logic handles the candlestick display
      ohlcData: stockData?.map(entry => ({
        x: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        o: entry.open, h: entry.high, l: entry.low, c: entry.close,
      })) || [],
      backgroundColor: 'rgba(0, 0, 0, 0)', // Make bars transparent, drawn by plugin
      borderColor: 'rgba(0, 0, 0, 0)',
      order: 1,
    }] : [{
      type: 'line' as const,
      label: `${stockSymbol} Close Price`,
      data: stockData?.map(entry => entry.close) || [],
      borderColor: '#10b981', // Emerald green line
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2, fill: true, tension: 0.3, pointRadius: 2, order: 1,
    }]),

    // --- Bollinger Bands (BBANDS) ---
    ...(showBollingerBands && stockData ? [
      // Upper Band
      {
        type: 'line' as const,
        label: 'Upper BB',
        data: bbands.upper.filter(v => v !== null) as any,
        borderColor: '#facc15', // Yellow
        backgroundColor: 'transparent',
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0.1, order: 3,
        hidden: bbands.upper.every(v => v === null) 
      },
      // Middle Band (SMA)
      {
        type: 'line' as const,
        label: 'Middle BB (SMA)',
        data: bbands.middle.filter(v => v !== null) as any,
        borderColor: '#3b82f6', // Blue
        backgroundColor: 'transparent',
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0.1, order: 3,
        hidden: bbands.middle.every(v => v === null)
      },
      // Lower Band
      {
        type: 'line' as const,
        label: 'Lower BB',
        data: bbands.lower.filter(v => v !== null) as any,
        borderColor: '#facc15', // Yellow
        backgroundColor: 'transparent',
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0.1, order: 3,
        hidden: bbands.lower.every(v => v === null)
      },
    ] : []),
    
    // --- Moving Averages (Enhanced) ---
    ...(showMovingAverage && stockData ? [
      // Primary Moving Average
      {
        type: 'line' as const,
        label: `${maType.toUpperCase()}(${maPeriod})`,
        data: (maType === 'sma' ? calculateSMA(stockData, maPeriod) : calculateEMA(stockData, maPeriod)).filter(v => v !== null) as any,
        borderColor: maType === 'sma' ? '#f97316' : '#a855f7', // Orange/Purple
        backgroundColor: 'transparent',
        borderWidth: 2, pointRadius: 0, fill: false, tension: 0.1, order: 2,
      },
      // SMA 20 (Short-term trend)
      {
        type: 'line' as const,
        label: 'SMA(20)',
        data: calculateSMA(stockData, 20).filter(v => v !== null) as any,
        borderColor: '#06b6d4', // Cyan
        backgroundColor: 'transparent',
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0.1, order: 2,
      },
      // SMA 50 (Medium-term trend)
      {
        type: 'line' as const,
        label: 'SMA(50)',
        data: calculateSMA(stockData, 50).filter(v => v !== null) as any,
        borderColor: '#8b5cf6', // Violet
        backgroundColor: 'transparent',
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0.1, order: 2,
      }
    ] : []),
  ];

  // Prepare RSI chart data (separate indicator)
  const rsiChartData = {
    labels: chartLabels,
    datasets: [
      {
        type: 'line' as const,
        label: 'RSI (14)',
        data: rsiData.filter(v => v !== 50) as any, 
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2, pointRadius: 0, fill: 'stack', tension: 0.2,
      },
      // Overbought Line (70)
      {
        type: 'line' as const,
        label: 'Overbought (70)',
        data: chartLabels.map(() => 70),
        borderColor: 'rgba(239, 68, 68, 0.7)', 
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0, stepped: true,
      },
      // Oversold Line (30)
      {
        type: 'line' as const,
        label: 'Oversold (30)',
        data: chartLabels.map(() => 30),
        borderColor: 'rgba(16, 185, 129, 0.7)', 
        borderWidth: 1, pointRadius: 0, fill: false, tension: 0, stepped: true,
      }
    ],
  };

  // Prepare Volume chart data
  const volumeChartData = {
    labels: chartLabels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Volume',
        data: stockData?.map(entry => entry.volume) || [],
        backgroundColor: stockData?.map((entry, index) => {
          if (index === 0) return '#6366f1';
          const prevClose = stockData[index - 1].close;
          return entry.close >= prevClose ? '#10b981' : '#ef4444';
        }) || [],
        borderColor: 'transparent',
        borderWidth: 0,
      }
    ],
  };

  // Prepare Daily Returns chart data
  const dailyReturnsData = stockData ? calculateDailyReturns(stockData) : [];
  const dailyReturnsChartData = {
    labels: chartLabels,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Daily Returns (%)',
        data: dailyReturnsData || [],
        backgroundColor: dailyReturnsData.map(ret => 
          ret === null ? '#6b7280' : ret >= 0 ? '#10b981' : '#ef4444'
        ),
        borderColor: 'transparent',
        borderWidth: 0,
      }
    ],
  };

  // Main Price Chart Options
  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300, easing: 'easeInOutQuad' as const },
    onClick: handleChartClick,
    onHover: (event: any, elements: any, chart: any) => {
      // Change cursor when in drawing mode
      chart.canvas.style.cursor = drawingMode !== 'none' ? 'crosshair' : 'default';
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: textColor } },
      annotation: {
        annotations: annotations.reduce((acc: any, annotation) => {
          if (!annotation.visible) return acc;

          console.log(`Rendering annotation: ${annotation.id} (${annotation.type})`);

          if (annotation.type === 'trendline' && annotation.points.length >= 2) {
            const [start, end] = annotation.points;
            
            console.log(`Processing trendline annotation:`, { start, end, chartLabelsLength: chartLabels.length });
            
            // For category scale, use the data index directly
            // For other scales, use the coordinate value
            const startX = Math.max(0, Math.min(Math.round(start.x), chartLabels.length - 1));
            const endX = Math.max(0, Math.min(Math.round(end.x), chartLabels.length - 1));
            
            acc[annotation.id] = {
              type: 'line',
              xMin: startX,
              yMin: start.y,
              xMax: endX,
              yMax: end.y,
              borderColor: annotation.color,
              borderWidth: 4,
              borderDash: [],
              label: {
                display: true,
                content: annotation.label,
                position: 'start',
                backgroundColor: annotation.color,
                color: '#fff',
                padding: 6,
                borderRadius: 4,
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            };
            
            console.log(`Trendline annotation final config:`, {
              id: annotation.id,
              xMin: startX,
              xMax: endX,
              yMin: start.y,
              yMax: end.y,
              startLabel: chartLabels[startX],
              endLabel: chartLabels[endX]
            });
          }

          if (annotation.type === 'point' && annotation.points.length >= 1) {
            const point = annotation.points[0];
            
            acc[annotation.id] = {
              type: 'point',
              xValue: Math.min(Math.max(point.x, 0), chartLabels.length - 1),
              yValue: point.y,
              backgroundColor: annotation.color,
              borderColor: annotation.color,
              borderWidth: 2,
              radius: 8,
              label: {
                display: true,
                content: annotation.label,
                position: 'top',
                backgroundColor: annotation.color,
                color: '#fff',
                padding: 4,
                borderRadius: 4
              }
            };
            
            console.log(`Point annotation config:`, acc[annotation.id]);
          }

          return acc;
        }, {})
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#1f2937',
        bodyColor: isDark ? '#ffffff' : '#1f2937',
        borderColor: '#10b981',
        borderWidth: 1, cornerRadius: 8, padding: 12,
        callbacks: {
          title: (context: any) => context[0].label, // Use Category label (Date string)
          beforeBody: (context: any) => {
            // Get the data index from the first tooltip item
            const dataIndex = context[0].dataIndex;
            if (stockData && stockData[dataIndex]) {
              const volumeData = stockData[dataIndex].volume;
              const formattedVolume = volumeData >= 1000000 
                ? `${(volumeData / 1000000).toFixed(1)}M` 
                : volumeData >= 1000 
                ? `${(volumeData / 1000).toFixed(1)}K` 
                : volumeData.toLocaleString();
              
              return [`📊 Volume: ${formattedVolume}`, ''];
            }
            return '';
          },
          label: (context: any) => {
            const dataset = context.dataset;
            const value = context.parsed.y;
            const dataIndex = context.dataIndex;
            
            // Handle Candlestick tooltip manually using the ohlcData property
            if (dataset.ohlcData) {
                const dataPoint = dataset.ohlcData.find((d: any) => d.x === context.label);
                
                // Show OHLC details + Volume for the main price bar/candlestick dataset
                if (dataPoint && (dataset.label.includes('Price Range'))) {
                    const isBullish = dataPoint.c > dataPoint.o;
                    const change = dataPoint.c - dataPoint.o;
                    const changePercent = (change / dataPoint.o) * 100;
                    
                    // Get volume data for this specific point
                    const volumeData = stockData && stockData[dataIndex] ? stockData[dataIndex].volume : 0;
                    const formattedVolume = volumeData >= 1000000 
                      ? `${(volumeData / 1000000).toFixed(2)}M` 
                      : volumeData >= 1000 
                      ? `${(volumeData / 1000).toFixed(1)}K` 
                      : volumeData.toLocaleString();

                    return [
                        `${isBullish ? '🟢 BULLISH' : '🔴 BEARISH'} Candle`,
                        `Open: $${dataPoint.o.toFixed(2)}`,
                        `High: $${dataPoint.h.toFixed(2)}`,
                        `Low: $${dataPoint.l.toFixed(2)}`,
                        `Close: $${dataPoint.c.toFixed(2)}`,
                        `Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)`,
                        `Volume: ${formattedVolume}`
                    ];
                }
            }
            // Show standard line/indicator data with volume context
            if (stockData && stockData[dataIndex]) {
              const volumeData = stockData[dataIndex].volume;
              const formattedVolume = volumeData >= 1000000 
                ? `${(volumeData / 1000000).toFixed(2)}M` 
                : volumeData >= 1000 
                ? `${(volumeData / 1000).toFixed(1)}K` 
                : volumeData.toLocaleString();
              
              return [
                `${dataset.label}: $${value.toFixed(2)}`,
                `Volume: ${formattedVolume}`
              ];
            }
            
            return `${dataset.label}: $${value.toFixed(2)}`;
          }
        }
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const, 
        ticks: { color: secondaryTextColor },
        grid: { color: gridColor },
      },
      y: {
        display: true,
        position: 'right' as const,
        ticks: { color: secondaryTextColor, callback: (value: any) => `$${Number(value).toFixed(2)}` },
        grid: { color: gridColor },
      },
    },
  };
  
  // RSI Chart Options
  const rsiOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#1f2937',
          bodyColor: isDark ? '#ffffff' : '#1f2937',
          borderColor: '#10b981',
          borderWidth: 1
        }
    },
    scales: {
      x: {
        display: true,
        ticks: { color: secondaryTextColor },
        grid: { color: gridColor }
      }, 
      y: {
        min: 0,
        max: 100,
        position: 'right' as const,
        ticks: { color: secondaryTextColor },
        grid: { color: gridColor },
        border: { display: false },
      },
    },
  };

  // Volume Chart Options
  const volumeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#1f2937',
        bodyColor: isDark ? '#ffffff' : '#1f2937',
        borderColor: '#10b981',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `Volume: ${(value / 1000000).toFixed(2)}M`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: { color: secondaryTextColor },
        grid: { color: gridColor }
      },
      y: {
        position: 'right' as const,
        ticks: { 
          color: secondaryTextColor,
          callback: (value: any) => `${(Number(value) / 1000000).toFixed(1)}M`
        },
        grid: { color: gridColor },
      },
    },
  };

  // Daily Returns Chart Options
  const dailyReturnsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#1f2937',
        bodyColor: isDark ? '#ffffff' : '#1f2937',
        borderColor: '#10b981',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return value !== null ? `Daily Return: ${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : 'N/A';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: { color: secondaryTextColor },
        grid: { color: gridColor }
      },
      y: {
        position: 'right' as const,
        ticks: { 
          color: secondaryTextColor,
          callback: (value: any) => `${Number(value).toFixed(1)}%`
        },
        grid: { color: gridColor },
      },
    },
  };

  const renderPriceChart = () => {
    if (!stockData || stockData.length === 0) return null;

    return (
      <Chart
        ref={chartRef}
        type={chartType === 'line' ? 'line' : 'bar'} // Use 'bar' type for custom rendering
        data={{ labels: chartLabels, datasets: chartDatasets as any }}
        options={priceChartOptions as any}
        plugins={[
            // Custom drawing plugin for Candlestick simulation
            {
                id: 'customFinancialChart',
                beforeDatasetsDraw(chart: any, args: any, options: any) {
                    if (chartType !== 'candlestick') return;
                    
                    const { ctx, scales } = chart;
                    const { x, y } = scales;
                    const dataset = chart.data.datasets.find((ds: any) => ds.ohlcData);
                    if (!dataset || !dataset.ohlcData) return;

                    const upColor = '#10b981'; // Emerald Green (Bullish)
                    const downColor = '#ef4444'; // Red (Bearish)
                    const candleWidth = 10; 

                    dataset.ohlcData.forEach((dataPoint: any, index: number) => {
                        const xCoord = x.getPixelForValue(index); // Use index for category scale
                        const oCoord = y.getPixelForValue(dataPoint.o);
                        const hCoord = y.getPixelForValue(dataPoint.h);
                        const lCoord = y.getPixelForValue(dataPoint.l);
                        const cCoord = y.getPixelForValue(dataPoint.c);

                        const isBullish = dataPoint.c > dataPoint.o;
                        const color = isBullish ? upColor : downColor;

                        // --- 1. Draw the Wick (High-Low Line) ---
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 1;
                        ctx.moveTo(xCoord, hCoord);
                        ctx.lineTo(xCoord, lCoord);
                        ctx.stroke();

                        // --- 2. Draw Candlestick Body ---
                        // Candlestick Body (Open-Close rectangle)
                        const bodyTop = isBullish ? cCoord : oCoord;
                        const bodyBottom = isBullish ? oCoord : cCoord;
                        ctx.fillStyle = isBullish ? upColor : downColor;
                        ctx.fillRect(xCoord - candleWidth / 2, bodyTop, candleWidth, bodyBottom - bodyTop);
                        
                        // Optional: Add a thin border to the candle body for definition
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(xCoord - candleWidth / 2, bodyTop, candleWidth, bodyBottom - bodyTop);
                    });
                }
            }
        ]}
      />
    );
  };

  const renderRSIChart = () => {
    if (!showRSI || !stockData || stockData.length === 0) return null;
    return (
        <div className={`mt-6 border-t ${borderColor} pt-6`}>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                <Target className="w-5 h-5 text-blue-400" /> Relative Strength Index (RSI 14)
            </h3>
            <div className="h-[250px]">
                <Line data={rsiChartData as any} options={rsiOptions as any} />
            </div>
        </div>
    );
  };

  const renderVolumeChart = () => {
    if (!stockData || stockData.length === 0) return null;
    return (
        <div className={`mt-6 border-t ${borderColor} pt-6`}>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                <Activity className="w-5 h-5 text-green-400" /> Volume Analysis
            </h3>
            <div className="h-[250px]">
                <Bar data={volumeChartData as any} options={volumeOptions as any} />
            </div>
        </div>
    );
  };

  const renderDailyReturnsChart = () => {
    if (!stockData || stockData.length === 0) return null;
    return (
        <div className={`mt-6 border-t ${borderColor} pt-6`}>
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                <TrendingUp className="w-5 h-5 text-purple-400" /> Daily Returns (%)
            </h3>
            <div className="h-[250px]">
                <Bar data={dailyReturnsChartData as any} options={dailyReturnsOptions as any} />
            </div>
        </div>
    );
  };

  // Calculate price change and percentage for the header
  const currentPrice = stockData && stockData.length > 0 ? stockData[stockData.length - 1].close : 0;
  const initialPrice = stockData && stockData.length > 0 ? stockData[0].open : 0;
  const priceChange = currentPrice - initialPrice;
  const percentageChange = initialPrice !== 0 ? ((priceChange / initialPrice) * 100) : 0;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#111827]' : 'bg-[#f9fafb]'} text-white p-4 lg:p-8 font-inter`}>
      <div className="max-w-7xl mx-auto">
        {/* --- Header & Summary --- */}
        <div className={`mb-10 p-6 rounded-3xl ${isDark ? 'bg-[#1e293b] shadow-2xl border border-gray-700/50' : 'bg-white shadow-xl border border-gray-200'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <Zap className={`h-8 w-8 ${isDark ? 'text-[#10b981]' : 'text-[#059669]'}`} />
              <div>
                <h1 className={`text-4xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stockSymbol} Analysis Terminal
                </h1>
                <p className="text-gray-400 mt-1">High-Frequency Mock Data Analysis</p>
              </div>
            </div>

            {/* Price Snapshot & Theme Toggle */}
            <div className="flex flex-col items-end gap-2">
                <button
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                    className={`p-2 rounded-full transition-colors ${
                        isDark ? 'bg-[#2d3748] hover:bg-[#374151] text-yellow-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <p className={`text-2xl font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    Current Price: 
                    <span className="ml-2 text-4xl font-extrabold">
                        ${currentPrice.toFixed(2)}
                    </span>
                </p>
                <div className={`text-xl font-semibold mt-1 ${priceChange >= 0 ? 'text-[#10b981]' : 'text-red-500'}`}>
                    {priceChange >= 0 ? '▲' : '▼'} {priceChange.toFixed(2)} 
                    <span className="ml-1 text-base font-medium">({percentageChange.toFixed(2)}%)</span>
                </div>
            </div>
          </div>
        </div>

        {/* --- Controls Section --- */}
        <div className={`mb-8 p-6 rounded-3xl ${cardColor} shadow-xl border ${borderColor}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* 1. Symbol Search */}
            <div className="md:col-span-1">
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-400 mb-2">Stock Symbol</label>
              <div className="flex gap-2">
                <input
                  id="symbol"
                  type="text"
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className={`flex-1 px-4 py-2.5 ${isDark ? 'bg-[#2d3748] border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-800'} border rounded-xl focus:ring-2 focus:ring-[#10b981] outline-none transition`}
                  placeholder="e.g., TSLA, GOOG"
                  disabled={loading}
                />
                <button
                  onClick={handleSymbolSearch}
                  disabled={loading || !inputSymbol.trim()}
                  className="p-2.5 bg-[#10b981] text-white rounded-xl hover:bg-[#059669] disabled:opacity-50 transition"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 2. Time Frame */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Time Frame</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {timeFrameOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTimeFrame(option.value)}
                    disabled={loading}
                    className={`px-2 py-2 text-xs font-semibold rounded-xl transition-colors ${
                      selectedTimeFrame === option.value
                        ? 'bg-[#10b981] text-white shadow-md'
                        : isDark ? 'bg-[#2d3748] text-gray-300 hover:bg-[#374151]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Chart Type (Only Line and Candlestick) */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-400 mb-2">Chart Type</label>
              <div className="flex gap-2">
                {[
                  { value: 'line', label: 'Line' },
                  { value: 'candlestick', label: 'Candle' },
                  // Removed OHLC: { value: 'ohlc', label: 'OHLC' }
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value as any)}
                    className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      chartType === type.value
                        ? 'bg-[#3b82f6] text-white'
                        : isDark ? 'bg-[#2d3748] text-gray-300 hover:bg-[#374151]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 4. Indicators and Tools */}
            <div className={`md:col-span-3 xl:col-span-4 border-t ${borderColor} pt-4 mt-4`}>
              <label className="block text-sm font-medium text-gray-400 mb-3">Indicators</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {/* Toggle RSI */}
                <button
                  onClick={() => setShowRSI(!showRSI)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    showRSI ? 'bg-blue-600 text-white' : (isDark ? 'bg-[#2d3748] text-gray-300 hover:bg-[#374151]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  }`}
                >
                  <Target className="w-4 h-4" /> RSI {showRSI ? 'ON' : 'OFF'}
                </button>
                {/* Toggle BBands */}
                <button
                  onClick={() => setShowBollingerBands(!showBollingerBands)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    showBollingerBands ? 'bg-yellow-600 text-white' : (isDark ? 'bg-[#2d3748] text-gray-300 hover:bg-[#374151]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  }`}
                >
                  <Activity className="w-4 h-4" /> BBands {showBollingerBands ? 'ON' : 'OFF'}
                </button>
                {/* Toggle MA */}
                <button
                  onClick={() => setShowMovingAverage(!showMovingAverage)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    showMovingAverage ? 'bg-orange-600 text-white' : (isDark ? 'bg-[#2d3748] text-gray-300 hover:bg-[#374151]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> MA {showMovingAverage ? 'ON' : 'OFF'}
                </button>
                {/* Reset Zoom - Placeholder for hackathon requirement */}
                <button
                  title="Zoom/Pan feature requires external library not available in this environment."
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gray-500/20 text-gray-500 transition"
                  disabled
                >
                  🔍 Reset View
                </button>
                
                {/* MA Period Controls (Conditionally Rendered) */}
                {showMovingAverage && (
                  <>
                    <select
                      value={maType}
                      onChange={(e) => setMaType(e.target.value as 'sma' | 'ema')}
                      className={`px-4 py-2.5 text-sm font-medium ${isDark ? 'bg-[#2d3748] border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-800'} border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition`}
                    >
                      <option value="sma">SMA</option>
                      <option value="ema">EMA</option>
                    </select>
                    <input
                      type="number"
                      value={maPeriod}
                      onChange={(e) => setMaPeriod(Math.max(5, Number(e.target.value)))}
                      min="5"
                      max="200"
                      className={`px-4 py-2.5 text-sm font-medium ${isDark ? 'bg-[#2d3748] border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-800'} border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition`}
                      placeholder="Period (5-200)"
                    />
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* --- Main Chart and Indicators Container --- */}
                <div className={`p-6 rounded-3xl ${cardColor} shadow-2xl border ${borderColor}`}>
          {error ? (
            <div className="text-center p-10 bg-red-900/20 border border-red-700 rounded-xl">
              <p className="text-red-400 font-semibold text-lg">Error: {error}</p>
              <p className="text-gray-400 mt-2">Falling back to mock data. Check backend URL: http://localhost:8000</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-10 w-10 animate-spin text-[#10b981]" />
              <span className="ml-3 text-lg text-gray-300">Loading and crunching data...</span>
            </div>
          ) : stockData && stockData.length > 0 ? (
            <>
              {/* Price Chart - Increased Height */}
              <div className="h-[800px] relative"> 
                {renderPriceChart()}
              </div>

              {/* RSI Indicator */}
              {renderRSIChart()}
              {renderVolumeChart()}
              {renderDailyReturnsChart()}

              {/* Technical Metrics Dashboard */}
              {stockData && (
                <div className={`mt-6 border-t ${borderColor} pt-6`}>
                    <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                        <Activity className="w-5 h-5 text-purple-400" /> Technical Metrics Dashboard
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      {/* Price Changes */}
                      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Price Changes</h4>
                        <div className="space-y-1">
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            1D: <span className={`${calculatePriceChange(stockData, 1).changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {calculatePriceChange(stockData, 1).changePercent >= 0 ? '+' : ''}{calculatePriceChange(stockData, 1).changePercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            7D: <span className={`${calculatePriceChange(stockData, 7).changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {calculatePriceChange(stockData, 7).changePercent >= 0 ? '+' : ''}{calculatePriceChange(stockData, 7).changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Moving Averages */}
                      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Moving Averages</h4>
                        <div className="space-y-1">
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            SMA(20): <span>${calculateSMA(stockData, 20)[calculateSMA(stockData, 20).length - 1]?.toFixed(2) || 'N/A'}</span>
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            SMA(50): <span>${calculateSMA(stockData, 50)[calculateSMA(stockData, 50).length - 1]?.toFixed(2) || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* RSI & Volatility */}
                      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Momentum</h4>
                        <div className="space-y-1">
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            RSI: <span className={`${
                              calculateRSI(stockData.map(d => d.close))[calculateRSI(stockData.map(d => d.close)).length - 1] > 70 ? 'text-red-400' : 
                              calculateRSI(stockData.map(d => d.close))[calculateRSI(stockData.map(d => d.close)).length - 1] < 30 ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {calculateRSI(stockData.map(d => d.close))[calculateRSI(stockData.map(d => d.close)).length - 1]?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Volatility: <span>{calculateVolatility(stockData).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Sharpe Ratio */}
                      <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                        <h4 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Risk Metrics</h4>
                        <div className="space-y-1">
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Sharpe: <span className={`${
                              calculateSharpeRatio(stockData) > 1 ? 'text-green-400' : 
                              calculateSharpeRatio(stockData) > 0.5 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {calculateSharpeRatio(stockData).toFixed(2)}
                            </span>
                          </div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Latest Return: <span>{(() => {
                              const returns = calculateDailyReturns(stockData);
                              const latestReturn = returns[returns.length - 1];
                              return (latestReturn !== undefined && latestReturn !== null) ? latestReturn.toFixed(2) : 'N/A';
                            })()}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-gray-400">
              <p>No data available for display. Search for a symbol above.</p>
            </div>
          )}

        {/* Drawing Tools Panel */}
        {stockData && (
          <div className={`mt-6 p-4 rounded-2xl ${isDark ? 'bg-[#1e293b] border border-gray-700/50' : 'bg-white border border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
              <Pencil className="w-5 h-5 text-blue-400" /> Chart Drawing Tools
            </h3>
            
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { mode: 'none', label: '🖱️ Select Mode', icon: MousePointer },
                { mode: 'trendline', label: '📈 Draw 2-Point Line & Get AI Analysis', icon: TrendingUp },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setDrawingMode(mode as any);
                    setIsDrawing(false);
                    setCurrentDrawing(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    drawingMode === mode
                      ? 'bg-blue-600 text-white shadow-lg'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
              
              <button
                onClick={() => setAnnotations([])}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-auto ${
                  isDark ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>

            {/* Drawing Instructions */}
            {drawingMode === 'trendline' && (
              <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-blue-900/20 border border-blue-700/50' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${isDrawing ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  <p className={`text-sm font-medium ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    {!isDrawing ? 
                      '🎯 Click on the chart to place your first point' : 
                      '🎯 Click again to place your second point and get AI analysis!'
                    }
                  </p>
                </div>
                <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {isDrawing ? 
                    '✅ First point placed! Now click anywhere else on the chart for the second point.' :
                    'The AI will automatically analyze the trend between your two points!'
                  }
                </p>
                {currentDrawing && (
                  <p className={`text-xs ${isDark ? 'text-green-400' : 'text-green-600'} mt-1`}>
                    📍 First point: {chartLabels[Math.round(currentDrawing.points[0].x)]} at ${currentDrawing.points[0].y.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* Annotations List */}
            {annotations.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Active Annotations ({annotations.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isDark ? 'bg-gray-800' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {annotation.label} {annotation.aiGenerated && '(AI)'}
                        </span>
                      </div>
                      <button
                        onClick={() => setAnnotations(prev => prev.filter(a => a.id !== annotation.id))}
                        className={`text-gray-500 hover:text-red-400 transition-colors`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { mode: 'none', label: 'Select', icon: MousePointer },
                { mode: 'trendline', label: 'Trendline', icon: MinusIcon },
                { mode: 'support', label: 'Support', icon: MinusIcon },
                { mode: 'resistance', label: 'Resistance', icon: MinusIcon },
                { mode: 'point', label: 'Point', icon: Circle },
                { mode: 'rectangle', label: 'Rectangle', icon: Square }
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setDrawingMode(mode as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    drawingMode === mode
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
              
              <button
                onClick={clearAllAnnotations}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-auto ${
                  isDark ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>

            {/* Drawing Canvas Overlay */}
            {drawingMode !== 'none' && (
              <div className="relative">
                <canvas
                  ref={drawingCanvasRef}
                  className="absolute inset-0 pointer-events-auto cursor-crosshair"
                  style={{ zIndex: 10 }}
                  onMouseDown={startDrawing}
                  onMouseMove={continueDrawing}
                  onMouseUp={finishDrawing}
                />
              </div>
            )}

            {/* Annotations List */}
            {annotations.length > 0 && (
              <div className="mt-4">
                <h4 className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                  Active Annotations ({annotations.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {annotations.map((annotation) => (
                    <div
                      key={annotation.id}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        isDark ? 'bg-gray-800' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: annotation.color }}
                        />
                        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {annotation.label} {annotation.aiGenerated && '(AI)'}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteAnnotation(annotation.id)}
                        className={`text-gray-500 hover:text-red-400 transition-colors`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* AI Chat Panel - Sticky Positioned */}
      <div className={`fixed right-4 bottom-4 ${isDark ? 'bg-[#1e293b] border border-gray-700/50' : 'bg-white border border-gray-200'} rounded-2xl shadow-2xl transition-all duration-300 z-50 ${
        isChatExpanded ? 'w-96 h-[600px]' : 'w-16 h-16'
      }`}>
        
        {/* Chat Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
          {isChatExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>AI Trading Assistant</h3>
              </div>
              <button
                onClick={() => setIsChatExpanded(false)}
                className={`p-1 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'} transition-colors`}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsChatExpanded(true)}
              className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Chat Content - Only visible when expanded */}
        {isChatExpanded && (
          <>
            {/* Chat Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[400px]">
              {chatMessages.length === 0 ? (
                <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Bot className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm">Hi! I'm your AI trading assistant.</p>
                  <p className="text-xs mt-1">Ask me about technical analysis, trends, support levels, and more!</p>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.sender === 'ai' && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="w-3 h-3" />
                          <span className="text-xs opacity-70">AI Assistant</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {/* AI Typing Indicator */}
              {isAITyping && (
                <div className="flex justify-start">
                  <div className={`p-3 rounded-2xl ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      <span className="text-xs opacity-70">AI Assistant is typing</span>
                      <div className="flex gap-1 ml-2">
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-100"></div>
                        <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className={`p-4 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage(currentMessage)}
                  placeholder="Ask about trends, support levels, RSI..."
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isDark 
                      ? 'bg-gray-800 border border-gray-600 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500' 
                      : 'bg-gray-50 border border-gray-300 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500'
                  }`}
                  disabled={isAITyping}
                />
                <button
                  onClick={() => sendChatMessage(currentMessage)}
                  disabled={isAITyping || !currentMessage.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-1 mt-2">
                {[
                  "What's the trend?",
                  "Find support levels", 
                  "Analyze RSI",
                  "Check volume",
                  "Calculate volatility",
                  ...(annotations.length > 0 ? [
                    "Analyze my trendline",
                    "Is this a valid support level?",
                    "Is this a valid resistance level?"
                  ] : []),
                  "Test API Connection"
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendChatMessage(suggestion)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      isDark 
                        ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TechnicalAnalysisPage;