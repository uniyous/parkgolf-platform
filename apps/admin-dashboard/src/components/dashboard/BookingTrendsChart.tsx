import React, { useState } from 'react';

interface BookingTrendsData {
  hourly: { hour: string; bookings: number }[];
  daily: { day: string; bookings: number }[];
}

interface BookingTrendsChartProps {
  data: BookingTrendsData;
}

export const BookingTrendsChart: React.FC<BookingTrendsChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'hourly' | 'daily'>('hourly');
  
  const currentData = viewMode === 'hourly' ? data.hourly : data.daily;
  const maxBookings = Math.max(...currentData.map(d => d.bookings));
  const totalBookings = currentData.reduce((sum, d) => sum + d.bookings, 0);
  const avgBookings = totalBookings / currentData.length;

  // Find peak times
  const peakTime = currentData.reduce((prev, current) => 
    prev.bookings > current.bookings ? prev : current
  );

  const getBarColor = (value: number) => {
    const percentage = (value / maxBookings) * 100;
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 60) return 'bg-orange-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">예약 패턴 분석</h3>
            <p className="text-sm text-gray-500 mt-1">
              시간대별 예약 분포를 확인하세요
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('hourly')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'hourly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              시간별
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'daily'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              요일별
            </button>
          </div>
        </div>

        {/* Peak Time Alert */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              <span className="font-medium">피크 시간:</span> {peakTime.hour || peakTime.day}에 {peakTime.bookings}건으로 가장 많은 예약이 있습니다.
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          <div className="flex items-end justify-between space-x-1 h-48">
            {currentData.map((item, index) => {
              const height = (item.bookings / maxBookings) * 100;
              const barColor = getBarColor(item.bookings);
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center group">
                  {/* Tooltip */}
                  <div className="relative flex-1 w-full flex items-end">
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap">
                        {item.bookings}건
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                          <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bar */}
                    <div 
                      className={`w-full ${barColor} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  
                  {/* Label */}
                  <div className="mt-1 text-xs text-gray-500 text-center">
                    {viewMode === 'daily' ? item.day : item.hour}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">여유</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-gray-600">보통</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span className="text-gray-600">혼잡</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">매우 혼잡</span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
          <div>
            <p className="text-sm text-gray-500">총 예약</p>
            <p className="text-lg font-semibold text-gray-900">{totalBookings}건</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">평균</p>
            <p className="text-lg font-semibold text-gray-900">{avgBookings.toFixed(1)}건</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">분산도</p>
            <p className="text-lg font-semibold text-gray-900">
              {(((maxBookings - Math.min(...currentData.map(d => d.bookings))) / avgBookings) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};