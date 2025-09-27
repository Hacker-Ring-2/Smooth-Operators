'use client';

import React, { useState, useEffect } from 'react';
import { Line, Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import { Loader2, TrendingUp, Calendar, Search } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const [showVolume, setShowVolume] = useState(false);
  const chartRef = React.useRef<any>(null);

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
    const dataPoints = timeFrame === '1d' ? 24 : timeFrame === '5d' ? 120 : timeFrame === '1mo' ? 30 : timeFrame === '3mo' ? 90 : timeFrame === '1y' ? 252 : 100;
    const basePrice = 150 + Math.random() * 100; // Random base price between $150-250
    const mockData: StockData[] = [];

    for (let i = dataPoints; i >= 0; i--) {
      const date = new Date(now);
      if (timeFrame === '1d') {
        date.setHours(date.getHours() - i);
      } else if (timeFrame === '5d') {
        date.setHours(date.getHours() - i);
      } else {
        date.setDate(date.getDate() - i);
      }

      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const price = Math.max(basePrice * (1 + change * i * 0.001), 1); // Ensure price stays positive
      
      mockData.push({
        date: date.toISOString(),
        open: price * (0.99 + Math.random() * 0.02),
        high: price * (1.001 + Math.random() * 0.02),
        low: price * (0.99 - Math.random() * 0.02),
        close: price,
        volume: Math.floor(1000000 + Math.random() * 5000000)
      });
    }

    return mockData.reverse(); // Show chronological order
  };

  // Fetch stock data from backend API or use mock data
  const fetchStockData = async (symbol: string, timeFrame: string) => {
    setLoading(true);
    setError(null);
    try {
      const timeFrameOption = timeFrameOptions.find(opt => opt.value === timeFrame);
      const interval = timeFrameOption?.interval || '1d';
      
      // Try to fetch from backend API first
      try {
        const response = await fetch(
          `http://localhost:8000/api/stocks/historical/${symbol}?period=${timeFrame}&interval=${interval}`,
          { 
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        );
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        setStockData(result.data);
        return;
      } catch (apiError) {
        console.log('Backend API not available, using mock data for demonstration');
      }
      
      // If API fails, use mock data for demonstration
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      const mockData = generateMockData(symbol, timeFrame);
      setStockData(mockData);
      
    } catch (error) {
      console.error('Error fetching stock data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when symbol or time frame changes
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

  // Prepare enhanced interactive chart data
  const chartData = {
    labels: stockData?.map(entry => new Date(entry.date)) || [],
    datasets: [
      {
        label: `${stockSymbol} Price`,
        data: stockData?.map(entry => ({
          x: new Date(entry.date),
          y: entry.close,
          open: entry.open,
          high: entry.high,
          low: entry.low,
          volume: entry.volume
        })) || [],
        borderColor: '#4B9770',
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(75, 151, 112, 0.1)';
          
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(75, 151, 112, 0.3)');
          gradient.addColorStop(0.5, 'rgba(75, 151, 112, 0.15)');
          gradient.addColorStop(1, 'rgba(75, 151, 112, 0.02)');
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#4B9770',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
      },

    ],
  };

  // Enhanced interactive chart options with zoom and pan
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 16,
            weight: 'normal' as const,
            family: 'Inter, system-ui, sans-serif',
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#4B9770',
        borderWidth: 2,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: selectedTimeFrame === '1d' || selectedTimeFrame === '5d' ? '2-digit' : undefined,
              minute: selectedTimeFrame === '1d' || selectedTimeFrame === '5d' ? '2-digit' : undefined,
            });
          },
          label: (context: any) => {
            const dataset = context.dataset;
            const dataPoint = dataset.data[context.dataIndex];
            
            if (dataset.label.includes('Volume')) {
              return `Volume: ${context.parsed.y.toFixed(2)}M`;
            }
            
            if (dataPoint && typeof dataPoint === 'object' && 'open' in dataPoint) {
              return [
                `Close: $${dataPoint.y.toFixed(2)}`,
                `Open: $${dataPoint.open.toFixed(2)}`,
                `High: $${dataPoint.high.toFixed(2)}`,
                `Low: $${dataPoint.low.toFixed(2)}`,
                `Volume: ${(dataPoint.volume / 1000000).toFixed(2)}M`
              ];
            }
            
            return `${dataset.label}: $${context.parsed.y.toFixed(2)}`;
          },
        },
      },
      zoom: {
        limits: {
          x: {min: 'original' as const, max: 'original' as const},
          y: {min: 'original' as const, max: 'original' as const}
        },
        pan: {
          enabled: true,
          mode: 'x' as const,
          modifierKey: 'ctrl' as const,
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x' as const,
        }
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          maxTicksLimit: 8,
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        display: true,
        position: 'right' as const,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false,
        },
        ticks: {
          color: '#6B7280',
          padding: 12,
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif',
          },
          callback: function(value: any) {
            return '$' + Number(value).toFixed(2);
          },
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 8,
        hoverBorderWidth: 3,
      },
      line: {
        tension: 0.2,
      },
    },
  };

  // Calculate price change and percentage
  const currentPrice = stockData && stockData.length > 0 ? stockData[stockData.length - 1].close : 0;
  const previousPrice = stockData && stockData.length > 1 ? stockData[stockData.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const percentageChange = previousPrice !== 0 ? ((priceChange / previousPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#4B9770]/10 to-[#2d5a3d]/10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-gradient-to-br from-[#4B9770] to-[#2d5a3d] rounded-2xl shadow-lg">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Technical Analysis
                      </h1>
                      <p className="text-lg text-gray-600 mt-1">
                        Advanced stock chart analysis with real-time market data
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Demo Mode Badge */}
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 rounded-full backdrop-blur-sm">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700">Demo Mode Active</span>
                  </div>
                </div>
              </div>
              
              {/* Info Banner */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-2xl backdrop-blur-sm">
                <p className="text-sm text-blue-800 leading-relaxed">
                  💡 <strong>Tip:</strong> Currently showing mock data for demonstration. Start the backend server to access live market data via YFinance API.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Controls */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B9770]/5 to-[#2d5a3d]/5 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-8">
            <div className="flex flex-col xl:flex-row gap-8">
              {/* Stock Symbol Search Section */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-[#4B9770]/10 to-[#2d5a3d]/10 rounded-xl">
                    <Search className="h-5 w-5 text-[#4B9770]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Stock Symbol</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      id="symbol"
                      type="text"
                      value={inputSymbol}
                      onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3 text-lg font-semibold bg-gray-50/80 border-2 border-gray-200/50 rounded-2xl focus:ring-4 focus:ring-[#4B9770]/20 focus:border-[#4B9770] outline-none transition-all duration-300 backdrop-blur-sm placeholder:text-gray-400"
                      placeholder="Enter symbol (e.g., AAPL)"
                      disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <div className="h-6 w-px bg-gray-300"></div>
                    </div>
                  </div>
                  <button
                    onClick={handleSymbolSearch}
                    disabled={loading || !inputSymbol.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#4B9770] to-[#2d5a3d] text-white rounded-2xl hover:from-[#3d7d5c] hover:to-[#1e3d29] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                    <span className="font-medium">Search</span>
                  </button>
                </div>
              </div>

              {/* Time Frame Selection Section */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-[#4B9770]/10 to-[#2d5a3d]/10 rounded-xl">
                    <Calendar className="h-5 w-5 text-[#4B9770]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Time Frame</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {timeFrameOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedTimeFrame(option.value)}
                      disabled={loading}
                      className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                        selectedTimeFrame === option.value
                          ? 'bg-gradient-to-r from-[#4B9770] to-[#2d5a3d] text-white shadow-lg shadow-[#4B9770]/25'
                          : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80 hover:shadow-md backdrop-blur-sm border border-gray-200/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Controls */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Chart Options</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      showVolume
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📊 Volume
                  </button>
                  
                  <button
                    onClick={() => chartRef.current?.resetZoom()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-all duration-200"
                  >
                    🔍 Reset Zoom
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stock Info Card */}
        {stockData && stockData.length > 0 && (
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-[#4B9770]/10 to-[#2d5a3d]/10 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#4B9770]/5 to-[#2d5a3d]/5 p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-gradient-to-br from-[#4B9770] to-[#2d5a3d] rounded-2xl shadow-lg">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{stockSymbol}</h2>
                      <p className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        ${currentPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-start lg:items-end gap-3">
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-2xl font-semibold text-lg ${
                      priceChange >= 0 
                        ? 'bg-green-100/80 text-green-700 border border-green-200/50' 
                        : 'bg-red-100/80 text-red-700 border border-red-200/50'
                    }`}>
                      <span className={`h-3 w-3 rounded-full ${
                        priceChange >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}></span>
                      <span>
                        {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
                      </span>
                      <span className="text-sm opacity-80">
                        ({priceChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 bg-gray-100/50 px-3 py-1 rounded-full">
                        📈 Last updated: {new Date(stockData[stockData.length - 1].date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Chart Container */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#4B9770]/5 to-[#2d5a3d]/5 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
            {/* Chart Header */}
            <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-b border-gray-200/50 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gradient-to-br from-[#4B9770]/10 to-[#2d5a3d]/10 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-[#4B9770]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {stockSymbol} Price Chart
                    </h3>
                    <p className="text-gray-600">
                      {timeFrameOptions.find(opt => opt.value === selectedTimeFrame)?.label} Analysis
                    </p>
                  </div>
                </div>
                {loading && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-[#4B9770]/10 rounded-2xl border border-[#4B9770]/20">
                    <Loader2 className="h-5 w-5 animate-spin text-[#4B9770]" />
                    <span className="text-sm font-medium text-[#4B9770]">Analyzing market data...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Chart Area */}
            <div className="p-6">
              <div className="h-[600px] relative rounded-2xl bg-gradient-to-br from-gray-50/50 to-white/50 border border-gray-200/50">
                {error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <div className="p-4 bg-red-100/80 rounded-2xl mb-4 inline-block">
                        <TrendingUp className="h-12 w-12 text-red-500/70" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Unable to Load Data</h3>
                      <p className="text-red-600 mb-6 max-w-md mx-auto">{error}</p>
                      <button
                        onClick={() => fetchStockData(stockSymbol, selectedTimeFrame)}
                        className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <div className="relative mb-6">
                        <div className="h-16 w-16 mx-auto bg-gradient-to-r from-[#4B9770]/20 to-[#2d5a3d]/20 rounded-full flex items-center justify-center">
                          <Loader2 className="h-8 w-8 text-[#4B9770] animate-spin" />
                        </div>
                        <div className="absolute inset-0 bg-[#4B9770]/10 rounded-full animate-pulse"></div>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Market Data</h3>
                      <p className="text-gray-600">Fetching stock data for <span className="font-semibold text-[#4B9770]">{stockSymbol}</span>...</p>
                    </div>
                  </div>
                ) : stockData && stockData.length > 0 ? (
                  <div className="p-4 bg-white/50 rounded-xl">
                    <Line 
                      ref={chartRef}
                      data={chartData} 
                      options={chartOptions} 
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-8">
                      <div className="p-4 bg-gray-100/80 rounded-2xl mb-4 inline-block">
                        <TrendingUp className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-3">Ready to Analyze</h3>
                      <p className="text-gray-600 max-w-md mx-auto">Enter a stock symbol above to view interactive charts and technical analysis.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Volume Chart */}
        {showVolume && stockData && stockData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              📊 Volume Analysis - {stockSymbol}
            </h3>
            <div className="h-[200px] relative">
              <Line
                data={{
                  labels: stockData.map(entry => new Date(entry.date)),
                  datasets: [{
                    label: 'Volume (M)',
                    data: stockData.map(entry => ({
                      x: new Date(entry.date),
                      y: entry.volume / 1000000
                    })),
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderColor: 'rgba(59, 130, 246, 0.7)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      mode: 'index' as const,
                      intersect: false,
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      titleColor: '#fff',
                      bodyColor: '#fff',
                      borderColor: '#3b82f6',
                      borderWidth: 1,
                      callbacks: {
                        label: (context: any) => `Volume: ${context.parsed.y.toFixed(2)}M`
                      }
                    }
                  },
                  scales: {
                    x: { display: false },
                    y: {
                      display: true,
                      position: 'right' as const,
                      ticks: {
                        callback: (value: any) => `${value}M`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Interactive Chart Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">🎯 Interactive Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">🖱️ Mouse Controls:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Scroll wheel: Zoom in/out on X-axis</li>
                <li>• Ctrl + Drag: Pan across time periods</li>
                <li>• Hover: View detailed price info</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">📱 Touch Controls:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Pinch: Zoom in/out</li>
                <li>• Two-finger drag: Pan chart</li>
                <li>• Tap: View price details</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enhanced Data Summary */}
        {stockData && stockData.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#4B9770]/5 to-[#2d5a3d]/5 rounded-3xl blur-2xl"></div>
            <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-[#4B9770]/10 to-[#2d5a3d]/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-[#4B9770]" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Market Statistics</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group hover:scale-105 transition-all duration-300">
                  <div className="text-center p-6 bg-gradient-to-br from-green-50/80 to-emerald-50/80 border border-green-200/50 rounded-2xl backdrop-blur-sm shadow-lg hover:shadow-xl">
                    <div className="h-12 w-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">↑</span>
                    </div>
                    <p className="text-sm font-medium text-green-700 mb-1">Period High</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Math.max(...stockData.map(d => d.high)).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="group hover:scale-105 transition-all duration-300">
                  <div className="text-center p-6 bg-gradient-to-br from-red-50/80 to-rose-50/80 border border-red-200/50 rounded-2xl backdrop-blur-sm shadow-lg hover:shadow-xl">
                    <div className="h-12 w-12 mx-auto mb-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">↓</span>
                    </div>
                    <p className="text-sm font-medium text-red-700 mb-1">Period Low</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${Math.min(...stockData.map(d => d.low)).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="group hover:scale-105 transition-all duration-300">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border border-blue-200/50 rounded-2xl backdrop-blur-sm shadow-lg hover:shadow-xl">
                    <div className="h-12 w-12 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">📊</span>
                    </div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Volume</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(stockData[stockData.length - 1].volume / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
                
                <div className="group hover:scale-105 transition-all duration-300">
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50/80 to-violet-50/80 border border-purple-200/50 rounded-2xl backdrop-blur-sm shadow-lg hover:shadow-xl">
                    <div className="h-12 w-12 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">#</span>
                    </div>
                    <p className="text-sm font-medium text-purple-700 mb-1">Data Points</p>
                    <p className="text-2xl font-bold text-gray-900">{stockData.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalAnalysisPage;