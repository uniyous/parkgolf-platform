import React, { useState, useEffect } from 'react';
import { bookingApi } from '@/lib/api/bookingApi';
import type { 
  Course, 
  TimeSlotAvailability, 
  CreateBookingDto, 
  Booking 
} from '../../types';

interface BookingFormProps {
  course: Course;
  selectedDate: string;
  selectedTimeSlot: TimeSlotAvailability;
  onBookingCreated: (booking: Booking) => void;
  onCancel: () => void;
  initialData?: Partial<CreateBookingDto>;
}

interface BookingFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  numberOfPlayers: number;
  specialRequests: string;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  notes: string;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  course,
  selectedDate,
  selectedTimeSlot,
  onBookingCreated,
  onCancel,
  initialData
}) => {
  const [formData, setFormData] = useState<BookingFormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    numberOfPlayers: 1,
    specialRequests: '',
    paymentMethod: 'CASH',
    paymentStatus: 'PENDING',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 초기 데이터 설정
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  // 입력 필드 변경 핸들러
  const handleInputChange = (
    field: keyof BookingFormData,
    value: string | number
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 에러 제거
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 필수 필드 검증
    if (!formData.customerName.trim()) {
      newErrors.customerName = '고객명을 입력해주세요.';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = '연락처를 입력해주세요.';
    } else if (!/^[0-9-]+$/.test(formData.customerPhone)) {
      newErrors.customerPhone = '올바른 연락처 형식이 아닙니다.';
    }

    if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = '올바른 이메일 형식이 아닙니다.';
    }

    if (formData.numberOfPlayers < 1) {
      newErrors.numberOfPlayers = '인원은 1명 이상이어야 합니다.';
    }

    if (formData.numberOfPlayers > selectedTimeSlot.maxPlayers) {
      newErrors.numberOfPlayers = `최대 ${selectedTimeSlot.maxPlayers}명까지 예약 가능합니다.`;
    }

    if (formData.numberOfPlayers > selectedTimeSlot.availableSlots) {
      newErrors.numberOfPlayers = `잔여 자리는 ${selectedTimeSlot.availableSlots}자리입니다.`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 예약 생성
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const bookingData: CreateBookingDto = {
        courseId: course.id,
        timeSlotId: selectedTimeSlot.timeSlotId,
        bookingDate: selectedDate,
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        customerEmail: formData.customerEmail.trim() || undefined,
        numberOfPlayers: formData.numberOfPlayers,
        specialRequests: formData.specialRequests.trim() || undefined,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes.trim() || undefined,
        totalAmount: selectedTimeSlot.price * formData.numberOfPlayers
      };

      const newBooking = await bookingApi.createBooking(bookingData);
      onBookingCreated(newBooking);
    } catch (error) {
      console.error('Failed to create booking:', error);
      setErrors({ submit: '예약 생성에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setLoading(false);
    }
  };

  // 총 결제 금액 계산
  const calculateTotalAmount = () => {
    return selectedTimeSlot.price * formData.numberOfPlayers;
  };

  // 시간 포맷팅
  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  // 가격 포맷팅
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('ko-KR', options);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 w-full">
      {/* 헤더 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">새 예약 등록</h3>
            <p className="text-sm text-gray-600 mt-1">{course.name}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 예약 정보 요약 */}
      <div className="p-6 bg-blue-50 border-b border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-3">예약 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">날짜:</span>
            <span className="ml-2 font-medium text-gray-900">{formatDate(selectedDate)}</span>
          </div>
          <div>
            <span className="text-gray-600">시간:</span>
            <span className="ml-2 font-medium text-gray-900">
              {formatTimeRange(selectedTimeSlot.startTime, selectedTimeSlot.endTime)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">기본 요금:</span>
            <span className="ml-2 font-medium text-gray-900">{formatPrice(selectedTimeSlot.price)}/인</span>
          </div>
          <div>
            <span className="text-gray-600">잔여 자리:</span>
            <span className="ml-2 font-medium text-gray-900">{selectedTimeSlot.availableSlots}자리</span>
          </div>
        </div>
      </div>

      {/* 예약 폼 */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 에러 메시지 */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-700 text-sm">{errors.submit}</div>
          </div>
        )}

        {/* 고객 정보 */}
        <div>
          <h5 className="text-lg font-medium text-gray-900 mb-4">고객 정보</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 고객명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customerName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="고객명을 입력하세요"
              />
              {errors.customerName && (
                <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
              )}
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customerPhone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="010-1234-5678"
              />
              {errors.customerPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.customerPhone}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customerEmail ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="customer@example.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
              )}
            </div>

            {/* 인원 수 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                인원 수 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleInputChange('numberOfPlayers', Math.max(1, formData.numberOfPlayers - 1))}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  disabled={formData.numberOfPlayers <= 1}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  min="1"
                  max={selectedTimeSlot.maxPlayers}
                  value={formData.numberOfPlayers}
                  onChange={(e) => handleInputChange('numberOfPlayers', parseInt(e.target.value) || 1)}
                  className={`w-20 px-3 py-2 border rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.numberOfPlayers ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('numberOfPlayers', Math.min(selectedTimeSlot.maxPlayers, formData.numberOfPlayers + 1))}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  disabled={formData.numberOfPlayers >= selectedTimeSlot.maxPlayers}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="text-sm text-gray-500 ml-2">
                  (최대 {selectedTimeSlot.maxPlayers}명)
                </span>
              </div>
              {errors.numberOfPlayers && (
                <p className="mt-1 text-sm text-red-600">{errors.numberOfPlayers}</p>
              )}
            </div>
          </div>
        </div>

        {/* 결제 정보 */}
        <div>
          <h5 className="text-lg font-medium text-gray-900 mb-4">결제 정보</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 결제 방법 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                결제 방법
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">현금</option>
                <option value="CARD">카드</option>
                <option value="TRANSFER">계좌이체</option>
                <option value="MOBILE">모바일결제</option>
              </select>
            </div>

            {/* 결제 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                결제 상태
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => handleInputChange('paymentStatus', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">결제 대기</option>
                <option value="PAID">결제 완료</option>
                <option value="FAILED">결제 실패</option>
              </select>
            </div>
          </div>

          {/* 총 결제 금액 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">총 결제 금액:</span>
              <span className="text-xl font-semibold text-gray-900">
                {formatPrice(calculateTotalAmount())}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatPrice(selectedTimeSlot.price)} × {formData.numberOfPlayers}명
            </div>
          </div>
        </div>

        {/* 추가 정보 */}
        <div>
          <h5 className="text-lg font-medium text-gray-900 mb-4">추가 정보</h5>
          <div className="space-y-4">
            {/* 특별 요청사항 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                특별 요청사항
              </label>
              <textarea
                rows={3}
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="특별한 요청사항이 있으시면 입력해주세요"
              />
            </div>

            {/* 관리자 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관리자 메모
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="내부 관리용 메모를 입력하세요"
              />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{loading ? '예약 생성 중...' : '예약 생성'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};