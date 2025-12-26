import React, { useState, useEffect } from 'react';
import { bookingApi } from '@/lib/api/bookingApi';
import type { Course, Booking, TimeSlotAvailability } from '../../types';
import type { DailyBookingData } from '@/lib/api/bookingApi';

interface BookingCalendarProps {
  course: Course;
  onDateSelect: (date: string) => void;
  onBookingSelect?: (booking: Booking) => void;
}

interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  bookingCount: number;
  totalSlots: number;
  availableSlots: number;
  status: 'available' | 'partial' | 'full' | 'closed';
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  course,
  onDateSelect,
  onBookingSelect
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [dailyData, setDailyData] = useState<Map<string, DailyBookingData>>(new Map());
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 달력 날짜 생성
  const generateCalendarDays = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const current = new Date(startDate);

    // 6주 * 7일 = 42일간의 날짜 생성
    for (let i = 0; i < 42; i++) {
      const dateString = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isToday = 
        current.getFullYear() === today.getFullYear() &&
        current.getMonth() === today.getMonth() &&
        current.getDate() === today.getDate();

      days.push({
        date: dateString,
        isCurrentMonth,
        isToday,
        isSelected: dateString === selectedDate,
        bookingCount: 0,
        totalSlots: 0,
        availableSlots: 0,
        status: 'available'
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // 월별 예약 데이터 로드
  const loadMonthlyData = async (date: Date) => {
    if (!course?.id) return;

    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      // 월간 예약 데이터 조회
      const bookings = await bookingApi.getBookingsByCourse(course.id, {
        dateFrom: startDate,
        dateTo: endDate
      });

      // 날짜별로 예약 데이터 그룹화
      const dailyDataMap = new Map<string, DailyBookingData>();
      
      // 각 날짜별로 예약 데이터와 가용성 정보 수집
      const currentCalendarDays = generateCalendarDays(date);
      for (const day of currentCalendarDays) {
        if (day.isCurrentMonth) {
          try {
            const dayData = await bookingApi.getDailyBookings(course.id, day.date);
            dailyDataMap.set(day.date, dayData);
          } catch (error) {
            console.error(`Failed to load data for ${day.date}:`, error);
          }
        }
      }

      setDailyData(dailyDataMap);

      // 달력 날짜 업데이트 (예약 현황 반영)
      const updatedDays = currentCalendarDays.map(day => {
        const dayData = dailyDataMap.get(day.date);
        if (!dayData) return day;

        const bookingCount = dayData.bookings.length;
        const totalSlots = dayData.availability.reduce((sum, slot) => sum + slot.maxPlayers, 0);
        const availableSlots = dayData.availability.reduce((sum, slot) => sum + slot.availableSlots, 0);
        
        let status: CalendarDay['status'] = 'available';
        if (totalSlots === 0) {
          status = 'closed';
        } else if (availableSlots === 0) {
          status = 'full';
        } else if (availableSlots < totalSlots * 0.5) {
          status = 'partial';
        }

        return {
          ...day,
          bookingCount,
          totalSlots,
          availableSlots,
          status
        };
      });

      setCalendarDays(updatedDays);
    } catch (error) {
      console.error('Failed to load monthly data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyData(currentDate);
  }, [currentDate, course?.id]);

  // 날짜 선택 핸들러
  const handleDateSelect = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    
    setSelectedDate(day.date);
    onDateSelect(day.date);
  };

  // 월 변경
  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // 오늘로 이동
  const goToToday = () => {
    setCurrentDate(new Date());
    const todayString = new Date().toISOString().split('T')[0];
    setSelectedDate(todayString);
    onDateSelect(todayString);
  };

  // 상태별 스타일
  const getDateStyle = (day: CalendarDay) => {
    const baseClasses = "w-full h-12 p-1 text-sm border border-gray-200 cursor-pointer transition-colors";
    
    if (!day.isCurrentMonth) {
      return `${baseClasses} text-gray-300 bg-gray-50`;
    }

    if (day.isSelected) {
      return `${baseClasses} bg-blue-500 text-white border-blue-500`;
    }

    if (day.isToday) {
      return `${baseClasses} bg-blue-50 text-blue-600 border-blue-300 font-semibold`;
    }

    switch (day.status) {
      case 'full':
        return `${baseClasses} bg-red-50 text-red-800 border-red-200`;
      case 'partial':
        return `${baseClasses} bg-yellow-50 text-yellow-800 border-yellow-200`;
      case 'closed':
        return `${baseClasses} bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`;
      default:
        return `${baseClasses} bg-white text-gray-900 hover:bg-gray-50`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
          </h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => changeMonth('next')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {dayNames.map((dayName, index) => (
          <div key={dayName} className={`p-3 text-center text-sm font-medium ${
            index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
          }`}>
            {dayName}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <div
            key={day.date}
            onClick={() => handleDateSelect(day)}
            className={getDateStyle(day)}
          >
            <div className="flex flex-col h-full">
              <div className="font-medium">
                {new Date(day.date).getDate()}
              </div>
              {day.isCurrentMonth && day.totalSlots > 0 && (
                <div className="flex-1 flex flex-col justify-end">
                  <div className="text-xs">
                    <div>{day.bookingCount}건</div>
                    {day.status !== 'closed' && (
                      <div className="text-gray-500">
                        {day.availableSlots}/{day.totalSlots}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
              <span className="text-gray-600">예약 가능</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
              <span className="text-gray-600">부분 예약</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span className="text-gray-600">예약 마감</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
              <span className="text-gray-600">휴무</span>
            </div>
          </div>
          {loading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>로딩 중...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};