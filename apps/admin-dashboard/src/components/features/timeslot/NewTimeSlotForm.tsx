import React, { useState, useEffect } from 'react';
import type { TimeSlot, CreateTimeSlotDto, UpdateTimeSlotDto, TimeSlotStatus } from '@/types/timeslot';

interface NewTimeSlotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimeSlotDto | UpdateTimeSlotDto) => void;
  timeSlot?: TimeSlot | null;
  mode: 'create' | 'edit';
  title: string;
}

interface FormData {
  courseId: number;
  date: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  price: number;
  status: TimeSlotStatus;
  isRecurring: boolean;
  recurringType?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurringFrequency?: number;
  recurringEndDate?: string;
  recurringMaxOccurrences?: number;
}

interface FormErrors {
  courseId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  maxPlayers?: string;
  price?: string;
  recurringEndDate?: string;
  recurringMaxOccurrences?: string;
}

export const NewTimeSlotForm: React.FC<NewTimeSlotFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  timeSlot,
  mode,
  title,
}) => {
  const [formData, setFormData] = useState<FormData>({
    courseId: 1,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    maxPlayers: 4,
    price: 80000,
    status: 'ACTIVE',
    isRecurring: false,
    recurringType: 'WEEKLY',
    recurringFrequency: 1,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const courseOptions = [
    { id: 1, name: '챔피언십 코스' },
    { id: 2, name: '이그제큐티브 코스' },
    { id: 3, name: '연습 코스' },
  ];

  const statusOptions: { value: TimeSlotStatus; label: string }[] = [
    { value: 'ACTIVE', label: '활성' },
    { value: 'INACTIVE', label: '비활성' },
    { value: 'CANCELLED', label: '취소' },
  ];

  // Initialize form data when editing
  useEffect(() => {
    if (mode === 'edit' && timeSlot) {
      setFormData({
        courseId: timeSlot.courseId,
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        maxPlayers: timeSlot.maxPlayers,
        price: timeSlot.price,
        status: timeSlot.status,
        isRecurring: timeSlot.isRecurring,
        recurringType: timeSlot.recurringPattern?.type || 'WEEKLY',
        recurringFrequency: timeSlot.recurringPattern?.frequency || 1,
        recurringEndDate: timeSlot.recurringPattern?.endDate,
        recurringMaxOccurrences: timeSlot.recurringPattern?.maxOccurrences,
      });
    }
  }, [mode, timeSlot]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.courseId) {
      newErrors.courseId = '코스를 선택해주세요.';
    }

    if (!formData.date) {
      newErrors.date = '날짜를 입력해주세요.';
    }

    if (!formData.startTime) {
      newErrors.startTime = '시작 시간을 입력해주세요.';
    }

    if (!formData.endTime) {
      newErrors.endTime = '종료 시간을 입력해주세요.';
    }

    if (formData.startTime >= formData.endTime) {
      newErrors.startTime = '시작 시간은 종료 시간보다 이전이어야 합니다.';
    }

    if (formData.maxPlayers < 1 || formData.maxPlayers > 8) {
      newErrors.maxPlayers = '최대 인원은 1~8명 사이여야 합니다.';
    }

    if (formData.price < 0) {
      newErrors.price = '가격은 0원 이상이어야 합니다.';
    }

    if (formData.isRecurring) {
      if (formData.recurringEndDate && formData.recurringEndDate <= formData.date) {
        newErrors.recurringEndDate = '반복 종료 날짜는 시작 날짜 이후여야 합니다.';
      }

      if (formData.recurringMaxOccurrences && formData.recurringMaxOccurrences < 1) {
        newErrors.recurringMaxOccurrences = '반복 횟수는 1회 이상이어야 합니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData: CreateTimeSlotDto | UpdateTimeSlotDto = {
        courseId: formData.courseId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        maxPlayers: formData.maxPlayers,
        price: formData.price,
        status: formData.status,
        isRecurring: formData.isRecurring,
        recurringPattern: formData.isRecurring ? {
          type: formData.recurringType!,
          frequency: formData.recurringFrequency!,
          endDate: formData.recurringEndDate,
          maxOccurrences: formData.recurringMaxOccurrences,
        } : undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    코스 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.courseId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">코스를 선택하세요</option>
                    {courseOptions.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                  {errors.courseId && <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상태
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">날짜 및 시간</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    날짜 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.startTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.startTime && <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.endTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.endTime && <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>}
                </div>
              </div>
            </div>

            {/* Capacity & Pricing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">용량 및 가격</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 인원 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="maxPlayers"
                    value={formData.maxPlayers}
                    onChange={handleInputChange}
                    min="1"
                    max="8"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxPlayers ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.maxPlayers && <p className="mt-1 text-sm text-red-600">{errors.maxPlayers}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    가격 (원) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                </div>
              </div>
            </div>

            {/* Recurring Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">반복 설정</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">반복 타임슬롯으로 설정</span>
                </label>

                {formData.isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        반복 유형
                      </label>
                      <select
                        name="recurringType"
                        value={formData.recurringType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="DAILY">매일</option>
                        <option value="WEEKLY">매주</option>
                        <option value="MONTHLY">매월</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        반복 간격
                      </label>
                      <input
                        type="number"
                        name="recurringFrequency"
                        value={formData.recurringFrequency}
                        onChange={handleInputChange}
                        min="1"
                        max="12"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        반복 종료 날짜
                      </label>
                      <input
                        type="date"
                        name="recurringEndDate"
                        value={formData.recurringEndDate || ''}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.recurringEndDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.recurringEndDate && <p className="mt-1 text-sm text-red-600">{errors.recurringEndDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최대 반복 횟수
                      </label>
                      <input
                        type="number"
                        name="recurringMaxOccurrences"
                        value={formData.recurringMaxOccurrences || ''}
                        onChange={handleInputChange}
                        min="1"
                        max="365"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.recurringMaxOccurrences ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.recurringMaxOccurrences && <p className="mt-1 text-sm text-red-600">{errors.recurringMaxOccurrences}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {mode === 'create' ? '생성' : '수정'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};