import React from 'react';
import type { TimeSlotStats as TimeSlotStatsType } from '@/types/timeslot';

interface TimeSlotStatsProps {
  stats: TimeSlotStatsType;
}

export const TimeSlotStats: React.FC<TimeSlotStatsProps> = ({ stats }) => {
  const utilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount || 0);
  };

  // Safe defaults for undefined values
  const safeStats = {
    totalSlots: stats?.totalSlots || 0,
    activeSlots: stats?.activeSlots || 0,
    fullyBookedSlots: stats?.fullyBookedSlots || 0,
    cancelledSlots: stats?.cancelledSlots || 0,
    totalRevenue: stats?.totalRevenue || 0,
    averageUtilization: stats?.averageUtilization || 0,
    totalBookings: stats?.totalBookings || 0,
    averagePrice: stats?.averagePrice || 0,
    peakHours: stats?.peakHours || [],
    topCourses: stats?.topCourses || [],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Slots */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">전체 타임슬롯</p>
            <p className="text-2xl font-bold text-gray-900">{safeStats.totalSlots.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full">
            활성 {safeStats.activeSlots}
          </span>
          <span className="text-gray-500 ml-2">/ {safeStats.totalSlots}</span>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">총 수익</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(safeStats.totalRevenue)}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-600">평균 {formatCurrency(safeStats.averagePrice)}</span>
        </div>
      </div>

      {/* Utilization Rate */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">평균 이용률</p>
            <p className="text-2xl font-bold text-gray-900">{safeStats.averageUtilization}%</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">만료된 슬롯</span>
            <span className={`px-2 py-1 rounded-full ${utilizationColor(safeStats.averageUtilization)}`}>
              {safeStats.fullyBookedSlots}개
            </span>
          </div>
        </div>
      </div>

      {/* Total Bookings */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">총 예약</p>
            <p className="text-2xl font-bold text-gray-900">{safeStats.totalBookings.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-red-600 bg-red-100 px-2 py-1 rounded-full">
            취소 {safeStats.cancelledSlots}
          </span>
        </div>
      </div>

      {/* Peak Hours */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 md:col-span-2">
        <h3 className="text-lg font-medium text-gray-900 mb-4">피크 시간대</h3>
        <div className="flex flex-wrap gap-2">
          {safeStats.peakHours.map((hour) => (
            <span
              key={hour}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              {hour}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-3">
          가장 예약이 많은 시간대입니다. 추가 슬롯 생성을 고려해보세요.
        </p>
      </div>

      {/* Top Courses */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 md:col-span-2">
        <h3 className="text-lg font-medium text-gray-900 mb-4">상위 코스</h3>
        <div className="space-y-4">
          {safeStats.topCourses.map((course, index) => (
            <div key={course.courseId} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{course.courseName}</p>
                  <p className="text-sm text-gray-500">{course.totalSlots}개 슬롯</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(course.revenue)}</p>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${utilizationColor(course.utilizationRate)}`}>
                    {course.utilizationRate}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};