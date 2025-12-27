import React from 'react';
import type { TimeSlotWizardData } from '@/types/courseCombo';

interface TimeSlotWizardStep2Props {
  data: TimeSlotWizardData;
  onUpdate: (updates: Partial<TimeSlotWizardData>) => void;
}

export const TimeSlotWizardStep2: React.FC<TimeSlotWizardStep2Props> = ({
  data,
  onUpdate
}) => {
  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    onUpdate({
      dateRange: {
        ...data.dateRange,
        [field]: value
      }
    });
  };

  const handleTimePatternChange = (updates: Partial<typeof data.timePattern>) => {
    onUpdate({
      timePattern: {
        ...data.timePattern,
        ...updates
      }
    });
  };

  const timePatternPresets = [
    {
      type: 'STANDARD' as const,
      name: '표준 시간',
      description: '평일 기준, 일반적인 운영 시간',
      startTime: '09:00',
      endTime: '17:00',
      interval: 30
    },
    {
      type: 'WEEKEND' as const,
      name: '주말/공휴일',
      description: '주말 및 공휴일 연장 운영',
      startTime: '08:00',
      endTime: '18:00',
      interval: 20
    },
    {
      type: 'CUSTOM' as const,
      name: '커스텀',
      description: '직접 설정',
      startTime: data.timePattern.startTime,
      endTime: data.timePattern.endTime,
      interval: data.timePattern.interval
    }
  ];

  const weekDays = [
    { key: 'monday', label: '월' },
    { key: 'tuesday', label: '화' },
    { key: 'wednesday', label: '수' },
    { key: 'thursday', label: '목' },
    { key: 'friday', label: '금' },
    { key: 'saturday', label: '토' },
    { key: 'sunday', label: '일' }
  ];

  const calculateDays = () => {
    const start = new Date(data.dateRange.startDate);
    const end = new Date(data.dateRange.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateTimeSlots = () => {
    if (data.timePattern.type === 'CUSTOM') return '설정에 따라 결정';
    
    const startTime = new Date(`2000-01-01T${data.timePattern.startTime}:00`);
    const endTime = new Date(`2000-01-01T${data.timePattern.endTime}:00`);
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const slots = Math.floor(duration / data.timePattern.interval);
    
    return `하루 약 ${slots}개`;
  };

  return (
    <div className="space-y-8">
      {/* 날짜 범위 설정 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">📅 날짜 범위</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작 날짜
            </label>
            <input
              type="date"
              value={data.dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료 날짜
            </label>
            <input
              type="date"
              value={data.dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              min={data.dateRange.startDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-700">
            총 <strong>{calculateDays()}일</strong> 동안 타임슬롯이 생성됩니다.
          </p>
        </div>
      </div>

      {/* 시간 패턴 설정 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">⏰ 시간 패턴</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {timePatternPresets.map((preset) => (
            <div
              key={preset.type}
              onClick={() => handleTimePatternChange({
                type: preset.type,
                startTime: preset.startTime,
                endTime: preset.endTime,
                interval: preset.interval
              })}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                data.timePattern.type === preset.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h5 className="font-semibold text-gray-900 mb-1">{preset.name}</h5>
              <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
              <div className="text-xs text-gray-500">
                {preset.startTime} - {preset.endTime}, {preset.interval}분 간격
              </div>
            </div>
          ))}
        </div>

        {/* 커스텀 설정 */}
        {data.timePattern.type === 'CUSTOM' && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h5 className="font-medium text-gray-900 mb-4">커스텀 시간 설정</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  시작 시간
                </label>
                <input
                  type="time"
                  value={data.timePattern.startTime}
                  onChange={(e) => handleTimePatternChange({ startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  종료 시간
                </label>
                <input
                  type="time"
                  value={data.timePattern.endTime}
                  onChange={(e) => handleTimePatternChange({ endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  간격 (분)
                </label>
                <select
                  value={data.timePattern.interval}
                  onChange={(e) => handleTimePatternChange({ interval: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15분</option>
                  <option value={20}>20분</option>
                  <option value={30}>30분</option>
                  <option value={45}>45분</option>
                  <option value={60}>60분</option>
                </select>
              </div>
            </div>

            {/* 요일 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                운영 요일
              </label>
              <div className="flex space-x-2">
                {weekDays.map((day) => (
                  <button
                    key={day.key}
                    onClick={() => {
                      const currentDays = data.timePattern.customDays || [];
                      const newDays = currentDays.includes(day.key)
                        ? currentDays.filter(d => d !== day.key)
                        : [...currentDays, day.key];
                      handleTimePatternChange({ customDays: newDays });
                    }}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                      (data.timePattern.customDays || []).includes(day.key)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-green-50 rounded-md">
          <p className="text-sm text-green-700">
            {calculateTimeSlots()} 타임슬롯이 생성됩니다.
          </p>
        </div>
      </div>

      {/* 예외 설정 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">🚫 예외 설정</h4>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.timePattern.excludeHolidays}
              onChange={(e) => handleTimePatternChange({ excludeHolidays: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              공휴일 자동 제외
            </span>
          </label>
          
          <div className="text-xs text-gray-500">
            한국 공휴일이 자동으로 제외됩니다. (설날, 추석, 어린이날 등)
          </div>
        </div>
      </div>
    </div>
  );
};