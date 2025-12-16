import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { courseApi } from '../../api/courseApi';
import { BookingCalendar } from './BookingCalendar';
import { TimeSlotPicker } from './TimeSlotPicker';
import { BookingForm } from './BookingForm';
import { BookingList } from './BookingList';
import { Breadcrumb } from '../common/Breadcrumb';
import type { 
  Course, 
  TimeSlotAvailability, 
  Booking 
} from '../../types';

type BookingView = 'calendar' | 'list' | 'form';

export const BookingManagement: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 뷰 상태
  const [currentView, setCurrentView] = useState<BookingView>('calendar');
  
  // 선택된 데이터
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlotAvailability | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // 새로고침 트리거
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 코스 정보 조회
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;

      setLoading(true);
      setError(null);

      try {
        const courseData = await courseApi.getCourseById(parseInt(courseId));
        setCourse(courseData);
      } catch (error) {
        console.error('Failed to fetch course:', error);
        setError('코스 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId]);

  // 날짜 선택 핸들러
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    
    // 달력에서 날짜를 선택하면 타임슬롯 선택 뷰로 이동
    if (currentView === 'calendar') {
      // 달력 뷰에서는 날짜 선택만 하고 뷰 변경하지 않음
    }
  };

  // 타임슬롯 선택 핸들러
  const handleTimeSlotSelect = (timeSlot: TimeSlotAvailability) => {
    setSelectedTimeSlot(timeSlot);
  };

  // 예약 생성 완료 핸들러
  const handleBookingCreated = (booking: Booking) => {
    setCurrentView('list');
    setSelectedDate('');
    setSelectedTimeSlot(null);
    setRefreshTrigger(prev => prev + 1);
  };

  // 예약 선택 핸들러
  const handleBookingSelect = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDate(booking.bookingDate);
  };

  // 예약 수정 핸들러
  const handleBookingEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedDate(booking.bookingDate);
    setCurrentView('form');
  };

  // 예약 취소 핸들러
  const handleBookingCancel = (booking: Booking) => {
    // 취소 확인 다이얼로그 등 구현 가능
    console.log('Cancel booking:', booking);
  };

  // 뷰 변경 핸들러
  const handleViewChange = (view: BookingView) => {
    setCurrentView(view);
  };

  // 새 예약 시작
  const startNewBooking = () => {
    setSelectedBooking(null);
    setSelectedDate('');
    setSelectedTimeSlot(null);
    setCurrentView('form');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-500">코스 정보를 불러오는 중...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg font-medium mb-4">
          {error || '코스를 찾을 수 없습니다.'}
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          이전 페이지로
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: '예약 관리', path: '/bookings', icon: '📅' },
          { label: course?.name || '코스', icon: '⛳' }
        ]}
      />

      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">예약 관리</h1>
            <p className="text-gray-600 mt-2">{course.name}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={startNewBooking}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              새 예약 등록
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleViewChange('calendar')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              달력 보기
            </button>
            <button
              onClick={() => handleViewChange('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              목록 보기
            </button>
            <button
              onClick={() => handleViewChange('form')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'form'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              예약 등록
            </button>
          </nav>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="space-y-8">
        {currentView === 'calendar' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* 달력 */}
            <div className="xl:col-span-2">
              <BookingCalendar
                course={course}
                onDateSelect={handleDateSelect}
                onBookingSelect={handleBookingSelect}
              />
            </div>

            {/* 타임슬롯 선택 */}
            <div className="xl:col-span-1">
              <TimeSlotPicker
                course={course}
                selectedDate={selectedDate}
                onTimeSlotSelect={handleTimeSlotSelect}
                selectedTimeSlot={selectedTimeSlot}
              />

              {/* 예약 등록 버튼 */}
              {selectedDate && selectedTimeSlot && (
                <div className="mt-6">
                  <button
                    onClick={() => setCurrentView('form')}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    이 시간으로 예약 등록하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'list' && (
          <BookingList
            course={course}
            onBookingSelect={handleBookingSelect}
            onBookingEdit={handleBookingEdit}
            onBookingCancel={handleBookingCancel}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'form' && (
          <div className="max-w-4xl mx-auto">
            {selectedDate && selectedTimeSlot ? (
              <BookingForm
                course={course}
                selectedDate={selectedDate}
                selectedTimeSlot={selectedTimeSlot}
                onBookingCreated={handleBookingCreated}
                onCancel={() => setCurrentView('calendar')}
                initialData={selectedBooking ? {
                  customerName: selectedBooking.customerName,
                  customerPhone: selectedBooking.customerPhone,
                  customerEmail: selectedBooking.customerEmail,
                  numberOfPlayers: selectedBooking.numberOfPlayers,
                  specialRequests: selectedBooking.specialRequests,
                  paymentMethod: selectedBooking.paymentMethod,
                  paymentStatus: selectedBooking.paymentStatus,
                  notes: selectedBooking.notes
                } : undefined}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-4xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">날짜와 시간을 선택하세요</h3>
                <p className="text-gray-500 mb-6">
                  새 예약을 등록하려면 먼저 달력에서 날짜를 선택하고 원하는 타임슬롯을 선택해주세요.
                </p>
                <button
                  onClick={() => setCurrentView('calendar')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  달력으로 이동
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 선택된 정보 요약 (개발용 - 나중에 제거 가능) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 text-xs max-w-sm">
          <div className="font-medium text-gray-900 mb-2">디버그 정보</div>
          <div className="space-y-1 text-gray-600">
            <div>현재 뷰: {currentView}</div>
            <div>선택된 날짜: {selectedDate || '없음'}</div>
            <div>선택된 타임슬롯: {selectedTimeSlot ? `${selectedTimeSlot.startTime}-${selectedTimeSlot.endTime}` : '없음'}</div>
            <div>선택된 예약: {selectedBooking ? `#${selectedBooking.id}` : '없음'}</div>
          </div>
        </div>
      )}
    </div>
  );
};