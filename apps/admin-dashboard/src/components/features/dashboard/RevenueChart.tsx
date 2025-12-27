import React from 'react';

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
}

interface RevenueChartProps {
  data: RevenueData[];
  timeRange: 'today' | 'week' | 'month';
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data, timeRange }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (timeRange === 'today') {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (timeRange === 'week') {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  // Calculate max values for scaling
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const maxBookings = Math.max(...data.map(d => d.bookings));

  // Calculate totals
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalBookings = data.reduce((sum, d) => sum + d.bookings, 0);
  const avgRevenue = totalRevenue / data.length;

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">매출 현황</h3>
            <p className="text-sm text-gray-500 mt-1">
              {timeRange === 'today' ? '오늘' : timeRange === 'week' ? '이번 주' : '이번 달'} 매출 추이
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">총 매출</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">평균 매출</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(avgRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
            <span>{formatCurrency(maxRevenue)}</span>
            <span>{formatCurrency(maxRevenue * 0.75)}</span>
            <span>{formatCurrency(maxRevenue * 0.5)}</span>
            <span>{formatCurrency(maxRevenue * 0.25)}</span>
            <span>0</span>
          </div>

          {/* Chart Area */}
          <div className="ml-14 relative h-64">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="border-t border-gray-100"></div>
              ))}
            </div>

            {/* Bars */}
            <div className="relative h-full flex items-end justify-between space-x-2">
              {data.map((item, index) => {
                const revenueHeight = (item.revenue / maxRevenue) * 100;
                const bookingsHeight = (item.bookings / maxBookings) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    {/* Tooltip */}
                    <div className="group relative flex-1 w-full flex items-end">
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                          <p className="font-medium">{formatCurrency(item.revenue)}</p>
                          <p className="text-gray-300">{item.bookings}건</p>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Revenue Bar */}
                      <div className="w-full flex justify-center space-x-1">
                        <div 
                          className="w-1/2 bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors cursor-pointer"
                          style={{ height: `${revenueHeight}%` }}
                        ></div>
                        {/* Bookings Bar */}
                        <div 
                          className="w-1/2 bg-blue-300 rounded-t-sm hover:bg-blue-400 transition-colors cursor-pointer"
                          style={{ height: `${bookingsHeight}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* X-axis label */}
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      {formatDate(item.date)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">매출</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-300 rounded"></div>
            <span className="text-sm text-gray-600">예약 건수</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
            <p className="text-sm text-gray-500">총 예약</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalRevenue / totalBookings)}
            </p>
            <p className="text-sm text-gray-500">평균 단가</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              +{((data[data.length - 1].revenue / data[0].revenue - 1) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">성장률</p>
          </div>
        </div>
      </div>
    </div>
  );
};