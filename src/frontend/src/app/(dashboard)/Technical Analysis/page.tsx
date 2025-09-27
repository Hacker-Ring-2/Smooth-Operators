'use client';

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
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
  Filler
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

  // Fetch stock data from backend API
  const fetchStockData = async (symbol: string, timeFrame: string) => {
    setLoading(true);
    setError(null);
    try {
      const timeFrameOption = timeFrameOptions.find(opt => opt.value === timeFrame);
      const interval = timeFrameOption?.interval || '1d';
      
      const response = await fetch(
        `http://localhost:8000/api/stocks/historical/${symbol}?period=${timeFrame}&interval=${interval}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const result: ApiResponse = await response.json();
      setStockData(result.data);
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

  // Prepare chart data
  const chartData = {
    labels: stockData?.map(entry => {
      const date = new Date(entry.date);
      if (selectedTimeFrame === '1d' || selectedTimeFrame === '5d') {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }) || [],
    datasets: [
      {
        label: `${stockSymbol} Close Price`,
        data: stockData?.map(entry => entry.close) || [],
        borderColor: '#4B9770',
        backgroundColor: 'rgba(75, 151, 112, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 6,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 14,
            weight: 'normal' as const,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#4B9770',
        borderWidth: 1,
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
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          callback: function(value: any) {
            return '$' + Number(value).toFixed(2);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Calculate price change and percentage
  const currentPrice = stockData && stockData.length > 0 ? stockData[stockData.length - 1].close : 0;
  const previousPrice = stockData && stockData.length > 1 ? stockData[stockData.length - 2].close : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const percentageChange = previousPrice !== 0 ? ((priceChange / previousPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-[#4B9770]" />
            <h1 className="text-3xl font-bold text-gray-900">Technical Analysis</h1>
          </div>
          <p className="text-gray-600">Interactive stock chart analysis with real-time data</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Stock Symbol Input */}
            <div className="flex items-center gap-3">
              <label htmlFor="symbol" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Stock Symbol:
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="symbol"
                  type="text"
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B9770] focus:border-[#4B9770] outline-none transition-colors w-32"
                  placeholder="AAPL"
                  disabled={loading}
                />
                <button
                  onClick={handleSymbolSearch}
                  disabled={loading || !inputSymbol.trim()}
                  className="px-4 py-2 bg-[#4B9770] text-white rounded-lg hover:bg-[#3d7d5c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </div>
            </div>

            {/* Time Frame Selection */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-600" />
              <div className="flex gap-2 flex-wrap">
                {timeFrameOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedTimeFrame(option.value)}
                    disabled={loading}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      selectedTimeFrame === option.value
                        ? 'bg-[#4B9770] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stock Info Card */}
        {stockData && stockData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{stockSymbol}</h2>
                <p className="text-3xl font-bold text-gray-800">${currentPrice.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-2 ${
                  priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="text-lg font-semibold">
                    {priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}
                  </span>
                  <span className="text-sm">
                    ({priceChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date(stockData[stockData.length - 1].date).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {stockSymbol} Price Chart - {timeFrameOptions.find(opt => opt.value === selectedTimeFrame)?.label}
            </h3>
            {loading && (
              <div className="flex items-center gap-2 text-[#4B9770]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading data...</span>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="h-[500px] relative">
            {error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-500 mb-2">
                    <TrendingUp className="h-12 w-12 mx-auto opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => fetchStockData(stockSymbol, selectedTimeFrame)}
                    className="px-4 py-2 bg-[#4B9770] text-white rounded-lg hover:bg-[#3d7d5c] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-[#4B9770] animate-spin mb-4" />
                  <p className="text-gray-600">Loading stock data for {stockSymbol}...</p>
                </div>
              </div>
            ) : stockData && stockData.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600">Please search for a valid stock symbol to view the chart.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Summary */}
        {stockData && stockData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">High</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${Math.max(...stockData.map(d => d.high)).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Low</p>
                <p className="text-lg font-semibold text-gray-900">
                  ${Math.min(...stockData.map(d => d.low)).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Volume</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(stockData[stockData.length - 1].volume / 1000000).toFixed(2)}M
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Data Points</p>
                <p className="text-lg font-semibold text-gray-900">{stockData.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalAnalysisPage;
