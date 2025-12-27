import React, { useState, useEffect } from 'react';
import type { TimeSlot, CreateTimeSlotDto, UpdateTimeSlotDto } from '@/types';

interface TimeSlotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTimeSlotDto | UpdateTimeSlotDto) => Promise<boolean>;
  timeSlot?: TimeSlot;
  mode: 'create' | 'edit';
  title: string;
}

export const TimeSlotForm: React.FC<TimeSlotFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  timeSlot,
  mode,
  title
}) => {
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    maxPlayers: 4,
    price: 10000,
    isActive: true
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 폼 데이터 초기화
  useEffect(() => {
    if (mode === 'edit' && timeSlot) {
      setFormData({
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        maxPlayers: timeSlot.maxPlayers,
        price: timeSlot.price,
        isActive: timeSlot.isActive
      });
    } else {
      setFormData({
        startTime: '',
        endTime: '',
        maxPlayers: 4,
        price: 10000,
        isActive: true
      });
    }
    setErrors({});
  }, [mode, timeSlot, isOpen]);

  // 입력 필드 변경 핸들러
  const handleInputChange = (field: keyof typeof formData, value: any) => {
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

    if (!formData.startTime) {
      newErrors.startTime = '시작 시간을 입력해주세요.';
    }

    if (!formData.endTime) {
      newErrors.endTime = '종료 시간을 입력해주세요.';
    }

    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = '종료 시간은 시작 시간보다 늦어야 합니다.';
    }

    if (formData.maxPlayers < 1) {
      newErrors.maxPlayers = '최대 인원은 1명 이상이어야 합니다.';
    }

    if (formData.maxPlayers > 20) {
      newErrors.maxPlayers = '최대 인원은 20명을 초과할 수 없습니다.';
    }

    if (formData.price < 0) {
      newErrors.price = '가격은 0원 이상이어야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const success = await onSubmit(formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: '저장에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={submitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 시작 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              시작 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startTime ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={submitting}
            />
            {errors.startTime && (
              <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
            )}
          </div>

          {/* 종료 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              종료 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endTime ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={submitting}
            />
            {errors.endTime && (
              <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
            )}
          </div>

          {/* 최대 인원 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최대 인원 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleInputChange('maxPlayers', Math.max(1, formData.maxPlayers - 1))}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                disabled={submitting || formData.maxPlayers <= 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxPlayers}
                onChange={(e) => handleInputChange('maxPlayers', parseInt(e.target.value) || 1)}
                className={`w-20 px-3 py-2 border rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.maxPlayers ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => handleInputChange('maxPlayers', Math.min(20, formData.maxPlayers + 1))}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                disabled={submitting || formData.maxPlayers >= 20}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <span className="text-sm text-gray-500">명</span>
            </div>
            {errors.maxPlayers && (
              <p className="mt-1 text-sm text-red-600">{errors.maxPlayers}</p>
            )}
          </div>

          {/* 가격 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              가격 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={submitting}
                placeholder="0"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-gray-500 text-sm">원</span>
              </div>
            </div>
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          {/* 활성 상태 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={submitting}
              />
              <span className="ml-2 text-sm text-gray-700">활성화</span>
            </label>
          </div>

          {/* 에러 메시지 */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              disabled={submitting}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              disabled={submitting}
            >
              {submitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{submitting ? '저장 중...' : mode === 'create' ? '추가' : '수정'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};