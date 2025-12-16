import React, { useState } from 'react';
import type { TimeSlotGenerationConfig } from '../../types/timeslot';

interface TimeSlotGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: TimeSlotGenerationConfig) => void;
}

export const TimeSlotGenerationModal: React.FC<TimeSlotGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<TimeSlotGenerationConfig>({
    courseId: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    pattern: 'HOURLY',
    startTime: '09:00',
    endTime: '17:00',
    interval: 60,
    maxPlayers: 4,
    price: 80000,
    excludeWeekends: false,
    excludeHolidays: false,
    customIntervals: [],
  });

  const courseOptions = [
    { id: 1, name: '챔피언십 코스' },
    { id: 2, name: '이그제큐티브 코스' },
    { id: 3, name: '연습 코스' },
  ];

  const patternOptions = [
    { value: 'HOURLY', label: '매시간' },
    { value: 'CUSTOM_INTERVALS', label: '사용자 정의 간격' },
    { value: 'AM_PM', label: '오전/오후' },
    { value: 'PEAK_HOURS', label: '피크 시간대' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(config.startDate) > new Date(config.endDate)) {
      alert('시작 날짜는 종료 날짜보다 이전이어야 합니다.');
      return;
    }

    if (config.startTime >= config.endTime) {
      alert('시작 시간은 종료 시간보다 이전이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      await onGenerate(config);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof TimeSlotGenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">타임슬롯 대량 생성</h2>
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
            {/* Basic Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">기본 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    코스 선택
                  </label>
                  <select
                    value={config.courseId}
                    onChange={(e) => handleInputChange('courseId', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {courseOptions.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    생성 패턴
                  </label>
                  <select
                    value={config.pattern}
                    onChange={(e) => handleInputChange('pattern', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {patternOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">날짜 범위</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 날짜
                  </label>
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 날짜
                  </label>
                  <input
                    type="date"
                    value={config.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Time Range */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">시간 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={config.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={config.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {config.pattern === 'CUSTOM_INTERVALS' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    간격 (분)
                  </label>
                  <input
                    type="number"
                    value={config.interval}
                    onChange={(e) => handleInputChange('interval', Number(e.target.value))}
                    min="15"
                    max="180"
                    step="15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Slot Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">슬롯 설정</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 인원
                  </label>
                  <input
                    type="number"
                    value={config.maxPlayers}
                    onChange={(e) => handleInputChange('maxPlayers', Number(e.target.value))}
                    min="1"
                    max="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기본 가격 (원)
                  </label>
                  <input
                    type="number"
                    value={config.price}
                    onChange={(e) => handleInputChange('price', Number(e.target.value))}
                    min="0"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Exclusions */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">제외 옵션</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.excludeWeekends}
                    onChange={(e) => handleInputChange('excludeWeekends', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">주말 제외</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.excludeHolidays}
                    onChange={(e) => handleInputChange('excludeHolidays', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">공휴일 제외</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">생성 미리보기</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 기간: {config.startDate} ~ {config.endDate}</p>
                <p>• 시간: {config.startTime} ~ {config.endTime}</p>
                <p>• 패턴: {patternOptions.find(p => p.value === config.pattern)?.label}</p>
                <p>• 최대 인원: {config.maxPlayers}명</p>
                <p>• 가격: {config.price.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isLoading ? '생성 중...' : '생성하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};