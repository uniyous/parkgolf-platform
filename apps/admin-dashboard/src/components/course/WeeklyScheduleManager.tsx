import React, { useState, useEffect } from 'react';
import { courseApi } from '../../api/courseApi';
import type { WeeklySchedule, CreateWeeklyScheduleDto, Course } from '../../types';

interface WeeklyScheduleManagerProps {
  course: Course;
}

interface ScheduleFormData {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

// 운영 패턴 프리셋
const OPERATION_PRESETS = {
  STANDARD: {
    name: "표준 운영",
    description: "평일 9-18시, 주말 8-20시",
    pattern: {
      weekdays: { open: "09:00", close: "18:00", active: true },
      weekends: { open: "08:00", close: "20:00", active: true }
    }
  },
  EXTENDED: {
    name: "연장 운영", 
    description: "평일 8-20시, 주말 7-21시",
    pattern: {
      weekdays: { open: "08:00", close: "20:00", active: true },
      weekends: { open: "07:00", close: "21:00", active: true }
    }
  },
  URBAN: {
    name: "도심형",
    description: "평일 위주, 월요일 휴무",
    pattern: {
      weekdays: { open: "09:00", close: "18:00", active: true },
      weekends: { open: "08:00", close: "18:00", active: true },
      monday: false
    }
  },
  RESORT: {
    name: "리조트형",
    description: "매일 7-21시 연장 운영",
    pattern: {
      weekdays: { open: "07:00", close: "21:00", active: true },
      weekends: { open: "07:00", close: "21:00", active: true }
    }
  },
  WEEKEND_ONLY: {
    name: "주말 전용",
    description: "토/일요일만 운영",
    pattern: {
      weekdays: { open: "09:00", close: "18:00", active: false },
      weekends: { open: "08:00", close: "20:00", active: true }
    }
  }
};

export const WeeklyScheduleManager: React.FC<WeeklyScheduleManagerProps> = ({ course }) => {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 요일별 스케줄 폼 데이터 (일요일=0, 월요일=1, ..., 토요일=6)
  const [scheduleData, setScheduleData] = useState<ScheduleFormData[]>([
    { dayOfWeek: 0, openTime: '09:00', closeTime: '18:00', isActive: true }, // 일요일
    { dayOfWeek: 1, openTime: '09:00', closeTime: '18:00', isActive: true }, // 월요일
    { dayOfWeek: 2, openTime: '09:00', closeTime: '18:00', isActive: true }, // 화요일
    { dayOfWeek: 3, openTime: '09:00', closeTime: '18:00', isActive: true }, // 수요일
    { dayOfWeek: 4, openTime: '09:00', closeTime: '18:00', isActive: true }, // 목요일
    { dayOfWeek: 5, openTime: '09:00', closeTime: '18:00', isActive: true }, // 금요일
    { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isActive: true }, // 토요일
  ]);

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  // 주간 스케줄 조회
  const fetchWeeklySchedule = async () => {
    if (!course?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await courseApi.getWeeklySchedule(course.id);
      setWeeklySchedules(data);
      
      // 기존 스케줄 데이터로 폼 업데이트
      if (data && data.length > 0) {
        const newScheduleData = [...scheduleData];
        data.forEach(schedule => {
          const index = schedule.dayOfWeek;
          if (index >= 0 && index < 7) {
            newScheduleData[index] = {
              dayOfWeek: schedule.dayOfWeek,
              openTime: schedule.openTime,
              closeTime: schedule.closeTime,
              isActive: schedule.isActive
            };
          }
        });
        setScheduleData(newScheduleData);
      }
    } catch (error: any) {
      // 404 에러는 아직 스케줄이 없는 정상적인 상황
      if (error?.message?.includes('404') || error?.status === 404) {
        console.log('No weekly schedule found for course, using default schedule');
        // 기본값 그대로 사용
      } else {
        setError('주간 스케줄 정보를 불러오는데 실패했습니다.');
        console.error('Failed to fetch weekly schedule:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklySchedule();
  }, [course?.id]);

  // 스케줄 데이터 변경 핸들러
  const handleScheduleChange = (dayIndex: number, field: keyof ScheduleFormData, value: string | boolean) => {
    setScheduleData(prev => {
      const newData = [...prev];
      newData[dayIndex] = {
        ...newData[dayIndex],
        [field]: value
      };
      return newData;
    });
  };

  // 모든 요일 일괄 설정
  const handleBulkUpdate = (field: 'openTime' | 'closeTime' | 'isActive', value: string | boolean) => {
    setScheduleData(prev => 
      prev.map(schedule => ({
        ...schedule,
        [field]: value
      }))
    );
  };

  // 프리셋 패턴 적용
  const applyPreset = (presetKey: keyof typeof OPERATION_PRESETS) => {
    const preset = OPERATION_PRESETS[presetKey];
    const newScheduleData = [...scheduleData];

    // 평일 적용 (월-금: 1-5)
    for (let i = 1; i <= 5; i++) {
      newScheduleData[i] = {
        dayOfWeek: i,
        openTime: preset.pattern.weekdays.open,
        closeTime: preset.pattern.weekdays.close,
        isActive: preset.pattern.weekdays.active
      };
    }

    // 주말 적용 (토일: 6, 0)
    newScheduleData[6] = {
      dayOfWeek: 6,
      openTime: preset.pattern.weekends.open,
      closeTime: preset.pattern.weekends.close,
      isActive: preset.pattern.weekends.active
    };
    newScheduleData[0] = {
      dayOfWeek: 0,
      openTime: preset.pattern.weekends.open,
      closeTime: preset.pattern.weekends.close,
      isActive: preset.pattern.weekends.active
    };

    // 특수 조건 적용
    if (preset.pattern.monday === false) {
      newScheduleData[1].isActive = false; // 월요일 휴무
    }

    setScheduleData(newScheduleData);
  };

  // 스마트 복사 기능
  const copyWeekdaysToAll = () => {
    const weekdayPattern = scheduleData[1]; // 월요일 패턴 사용
    setScheduleData(prev => 
      prev.map(schedule => ({
        ...schedule,
        openTime: weekdayPattern.openTime,
        closeTime: weekdayPattern.closeTime,
        isActive: weekdayPattern.isActive
      }))
    );
  };

  const copyWeekendsToSatSun = () => {
    const weekendPattern = scheduleData[6]; // 토요일 패턴 사용
    const newScheduleData = [...scheduleData];
    newScheduleData[0] = { ...newScheduleData[0], openTime: weekendPattern.openTime, closeTime: weekendPattern.closeTime, isActive: weekendPattern.isActive };
    newScheduleData[6] = { ...newScheduleData[6], openTime: weekendPattern.openTime, closeTime: weekendPattern.closeTime, isActive: weekendPattern.isActive };
    setScheduleData(newScheduleData);
  };

  const applyCommonTime = (openTime: string, closeTime: string) => {
    setScheduleData(prev => 
      prev.map(schedule => ({
        ...schedule,
        openTime,
        closeTime,
        isActive: true
      }))
    );
  };

  // 스케줄 저장
  const handleSaveSchedule = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // 스케줄 데이터를 API 형식으로 변환
      const apiData: CreateWeeklyScheduleDto[] = scheduleData.map(schedule => ({
        dayOfWeek: schedule.dayOfWeek,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        courseId: course.id,
        isActive: schedule.isActive
      }));

      await courseApi.updateWeeklySchedule(course.id, apiData);
      await fetchWeeklySchedule();
      setSuccessMessage('주간 스케줄이 성공적으로 저장되었습니다.');
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to save weekly schedule:', error);
      setError('주간 스케줄 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 시간 옵션 생성 (30분 단위)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  // 운영시간 계산
  const calculateOperatingHours = (openTime: string, closeTime: string) => {
    const open = new Date(`2000-01-01T${openTime}:00`);
    const close = new Date(`2000-01-01T${closeTime}:00`);
    const diffMs = close.getTime() - open.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">주간 운영 스케줄</h2>
          <p className="text-sm text-gray-600 mt-1">{course.name}</p>
        </div>
        <button
          onClick={handleSaveSchedule}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? '저장 중...' : '스케줄 저장'}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 성공 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {successMessage}
        </div>
      )}

      {/* 빠른 설정 프리셋 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">빠른 설정</h3>
            <p className="text-sm text-gray-600">일반적인 운영 패턴을 한 번에 적용하세요</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(OPERATION_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key as keyof typeof OPERATION_PRESETS)}
              className="p-3 bg-white rounded-lg border-2 border-transparent hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group"
            >
              <div className="font-medium text-gray-900 group-hover:text-blue-700 text-sm">
                {preset.name}
              </div>
              <div className="text-xs text-gray-500 mt-1 group-hover:text-blue-600">
                {preset.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 스마트 복사 기능 */}
      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <h3 className="text-sm font-medium text-amber-900 mb-3">스마트 복사</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyWeekdaysToAll}
            className="px-3 py-2 bg-white text-amber-700 text-sm rounded-md border border-amber-300 hover:bg-amber-100 transition-colors"
          >
            평일 시간을 모든 요일에 복사
          </button>
          <button
            onClick={copyWeekendsToSatSun}
            className="px-3 py-2 bg-white text-amber-700 text-sm rounded-md border border-amber-300 hover:bg-amber-100 transition-colors"
          >
            토요일 시간을 주말에 복사
          </button>
          <button
            onClick={() => applyCommonTime('09:00', '18:00')}
            className="px-3 py-2 bg-white text-amber-700 text-sm rounded-md border border-amber-300 hover:bg-amber-100 transition-colors"
          >
            전체 9-6시 적용
          </button>
          <button
            onClick={() => applyCommonTime('08:00', '20:00')}
            className="px-3 py-2 bg-white text-amber-700 text-sm rounded-md border border-amber-300 hover:bg-amber-100 transition-colors"
          >
            전체 8-8시 적용
          </button>
        </div>
      </div>

      {/* 고급 일괄 설정 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">고급 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">모든 요일 오픈 시간</label>
            <select
              onChange={(e) => e.target.value && handleBulkUpdate('openTime', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="">선택하세요</option>
              {generateTimeOptions().slice(12, 24).map(time => ( // 06:00 ~ 11:30
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">모든 요일 마감 시간</label>
            <select
              onChange={(e) => e.target.value && handleBulkUpdate('closeTime', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue=""
            >
              <option value="">선택하세요</option>
              {generateTimeOptions().slice(32, 46).map(time => ( // 16:00 ~ 22:30
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center text-sm text-gray-700">
              <input
                type="checkbox"
                onChange={(e) => handleBulkUpdate('isActive', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              모든 요일 활성화
            </label>
          </div>
        </div>
      </div>

      {/* 주간 스케줄 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">요일별 운영시간</h3>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">스케줄 정보를 불러오는 중...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scheduleData.map((schedule, index) => (
                <div key={schedule.dayOfWeek} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                  {/* 요일 */}
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      schedule.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {schedule.dayOfWeek === 0 ? '일' : schedule.dayOfWeek === 6 ? '토' : '평'}
                    </div>
                    <span className="ml-3 font-medium text-gray-900">{dayNames[index]}</span>
                  </div>

                  {/* 오픈 시간 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">오픈</label>
                    <select
                      value={schedule.openTime}
                      onChange={(e) => handleScheduleChange(index, 'openTime', e.target.value)}
                      disabled={!schedule.isActive}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      {generateTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  {/* 마감 시간 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">마감</label>
                    <select
                      value={schedule.closeTime}
                      onChange={(e) => handleScheduleChange(index, 'closeTime', e.target.value)}
                      disabled={!schedule.isActive}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      {generateTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>

                  {/* 운영시간 */}
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600">
                      {schedule.isActive ? 
                        `${calculateOperatingHours(schedule.openTime, schedule.closeTime)}시간` : 
                        '휴무'
                      }
                    </span>
                  </div>

                  {/* 활성 상태 */}
                  <div className="flex items-center">
                    <label className="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={schedule.isActive}
                        onChange={(e) => handleScheduleChange(index, 'isActive', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      운영
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 운영 현황 요약 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">운영 현황</h3>
            <p className="text-sm text-gray-600">현재 설정된 운영 스케줄 요약</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {scheduleData.filter(s => s.isActive).length}
              <span className="text-sm font-normal text-gray-500">/ 7일</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">운영 요일</div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {scheduleData
                .filter(s => s.isActive)
                .reduce((total, s) => total + calculateOperatingHours(s.openTime, s.closeTime), 0)
                .toFixed(1)}
              <span className="text-sm font-normal text-gray-500">시간</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">주간 총 운영시간</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {scheduleData.filter(s => s.isActive).length > 0 ? 
                (scheduleData
                  .filter(s => s.isActive)
                  .reduce((total, s) => total + calculateOperatingHours(s.openTime, s.closeTime), 0) / 
                 scheduleData.filter(s => s.isActive).length
                ).toFixed(1) : '0'}
              <span className="text-sm font-normal text-gray-500">시간</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">평균 일일 운영</div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-700">
              {(() => {
                const activeDays = scheduleData.filter(s => s.isActive);
                if (activeDays.length === 0) return '없음';
                const earliest = activeDays.reduce((min, s) => s.openTime < min ? s.openTime : min, '23:59');
                const latest = activeDays.reduce((max, s) => s.closeTime > max ? s.closeTime : max, '00:00');
                return `${earliest}-${latest}`;
              })()}
            </div>
            <div className="text-sm text-gray-600 mt-1">운영 시간대</div>
          </div>
        </div>

        {/* 요일별 운영 상태 */}
        <div className="mt-4 pt-4 border-t border-green-200">
          <div className="text-sm text-gray-600 mb-2">요일별 운영 상태</div>
          <div className="flex space-x-2">
            {dayNames.map((dayName, index) => {
              const schedule = scheduleData[index];
              return (
                <div
                  key={index}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    schedule.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {dayName.slice(0, 1)}
                  {schedule.isActive && (
                    <div className="text-xs mt-1 opacity-75">
                      {schedule.openTime.slice(0, 5)}-{schedule.closeTime.slice(0, 5)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};