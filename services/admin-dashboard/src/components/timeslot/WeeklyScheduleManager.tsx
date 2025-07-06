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

export const WeeklyScheduleManager: React.FC<WeeklyScheduleManagerProps> = ({ course }) => {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      if (data.length > 0) {
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
    } catch (error) {
      setError('주간 스케줄 정보를 불러오는데 실패했습니다.');
      console.error('Failed to fetch weekly schedule:', error);
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

  // 스케줄 저장
  const handleSaveSchedule = async () => {
    setSaving(true);
    setError(null);
    
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

      {/* 일괄 설정 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">일괄 설정</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">모든 요일 오픈 시간</label>
            <select
              onChange={(e) => handleBulkUpdate('openTime', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택하세요</option>
              {generateTimeOptions().slice(16, 24).map(time => ( // 08:00 ~ 11:30
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">모든 요일 마감 시간</label>
            <select
              onChange={(e) => handleBulkUpdate('closeTime', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택하세요</option>
              {generateTimeOptions().slice(32, 44).map(time => ( // 16:00 ~ 21:30
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

      {/* 요약 정보 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">운영 현황</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700">운영 요일:</span>
            <span className="ml-2 font-medium text-blue-900">
              {scheduleData.filter(s => s.isActive).length}일 / 7일
            </span>
          </div>
          <div>
            <span className="text-blue-700">주간 총 운영시간:</span>
            <span className="ml-2 font-medium text-blue-900">
              {scheduleData
                .filter(s => s.isActive)
                .reduce((total, s) => total + calculateOperatingHours(s.openTime, s.closeTime), 0)
                .toFixed(1)}시간
            </span>
          </div>
          <div>
            <span className="text-blue-700">평균 일일 운영시간:</span>
            <span className="ml-2 font-medium text-blue-900">
              {scheduleData.filter(s => s.isActive).length > 0 ? 
                (scheduleData
                  .filter(s => s.isActive)
                  .reduce((total, s) => total + calculateOperatingHours(s.openTime, s.closeTime), 0) / 
                 scheduleData.filter(s => s.isActive).length
                ).toFixed(1) : '0'}시간
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};