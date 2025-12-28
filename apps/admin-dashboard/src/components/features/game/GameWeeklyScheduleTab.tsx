import React, { useState } from 'react';
import {
  useGameWeeklySchedules,
  useCreateWeeklySchedule,
  useUpdateWeeklySchedule,
  useDeleteWeeklySchedule,
} from '@/hooks/queries';
import type { GameWeeklySchedule, CreateGameWeeklyScheduleDto } from '@/lib/api/gamesApi';
import { WeeklyScheduleWizard } from './WeeklyScheduleWizard';

interface GameWeeklyScheduleTabProps {
  gameId: number;
}

const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const dayShortNames = ['일', '월', '화', '수', '목', '금', '토'];

const defaultSchedule: Omit<CreateGameWeeklyScheduleDto, 'dayOfWeek'> = {
  startTime: '06:00',
  endTime: '18:00',
  interval: 30,
  isActive: true,
};

export const GameWeeklyScheduleTab: React.FC<GameWeeklyScheduleTabProps> = ({ gameId }) => {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateGameWeeklyScheduleDto | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Queries
  const { data: schedules, refetch } = useGameWeeklySchedules(gameId);
  const createMutation = useCreateWeeklySchedule();
  const updateMutation = useUpdateWeeklySchedule();
  const deleteMutation = useDeleteWeeklySchedule();

  // 스케줄 배열 안전하게 처리
  const scheduleList = Array.isArray(schedules) ? schedules : [];

  // 요일별 스케줄 맵
  const scheduleMap = new Map<number, GameWeeklySchedule>();
  scheduleList.forEach((s) => scheduleMap.set(s.dayOfWeek, s));

  const handleEdit = (dayOfWeek: number) => {
    const existing = scheduleMap.get(dayOfWeek);
    if (existing) {
      setFormData({
        dayOfWeek,
        startTime: existing.startTime,
        endTime: existing.endTime,
        interval: existing.interval ?? 30,
        isActive: existing.isActive,
      });
    } else {
      setFormData({
        ...defaultSchedule,
        dayOfWeek,
      });
    }
    setEditingDay(dayOfWeek);
  };

  const handleSave = async () => {
    if (!formData || editingDay === null) return;

    try {
      const existing = scheduleMap.get(editingDay);
      if (existing) {
        await updateMutation.mutateAsync({
          gameId,
          scheduleId: existing.id,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync({
          gameId,
          data: formData,
        });
      }
      setEditingDay(null);
      setFormData(null);
      refetch();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('스케줄 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (dayOfWeek: number) => {
    const existing = scheduleMap.get(dayOfWeek);
    if (!existing) return;

    const confirmed = window.confirm(`${dayNames[dayOfWeek]} 스케줄을 삭제하시겠습니까?`);
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync({ gameId, scheduleId: existing.id });
        refetch();
      } catch (error) {
        console.error('Failed to delete schedule:', error);
        alert('스케줄 삭제에 실패했습니다.');
      }
    }
  };

  const handleCancel = () => {
    setEditingDay(null);
    setFormData(null);
  };


  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">주간 스케줄</h2>
          <p className="text-sm text-gray-500 mt-1">
            요일별 운영 시간과 타임슬롯 간격을 설정합니다
          </p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          스케줄 일괄 생성
        </button>
      </div>

      {/* 주간 스케줄 그리드 */}
      <div className="grid grid-cols-7 gap-2">
        {/* 요일 헤더 */}
        {dayShortNames.map((day, index) => (
          <div
            key={index}
            className={`text-center py-2 font-medium text-sm ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}

        {/* 요일별 스케줄 카드 */}
        {dayNames.map((dayName, dayOfWeek) => {
          const schedule = scheduleMap.get(dayOfWeek);
          const isEditing = editingDay === dayOfWeek;

          return (
            <div
              key={dayOfWeek}
              className={`border rounded-lg p-3 min-h-[120px] ${
                schedule?.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'
              } ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
            >
              {isEditing && formData ? (
                // 편집 모드
                <div className="space-y-2">
                  <div className="flex items-center gap-0.5">
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="flex-1 min-w-0 px-1 py-1 text-xs border rounded [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                    <span className="text-gray-400 text-xs">~</span>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="flex-1 min-w-0 px-1 py-1 text-xs border rounded [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <select
                      value={formData.interval}
                      onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                      className="w-full px-1 py-1 text-xs border rounded"
                    >
                      <option value={10}>10분</option>
                      <option value={15}>15분</option>
                      <option value={20}>20분</option>
                      <option value={30}>30분</option>
                      <option value={60}>60분</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-1"
                    />
                    <span className="text-xs text-gray-600">활성화</span>
                  </div>
                  <div className="flex space-x-1 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-2 py-1 border text-gray-600 text-xs rounded hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : schedule ? (
                // 스케줄 있음
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-900">
                    {schedule.startTime} ~ {schedule.endTime}
                  </div>
                  <div className="text-xs text-gray-500">
                    {schedule.interval ?? 30}분 간격
                  </div>
                  {!schedule.isActive && (
                    <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      비활성
                    </span>
                  )}
                  <div className="flex space-x-1 pt-2">
                    <button
                      onClick={() => handleEdit(dayOfWeek)}
                      className="flex-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(dayOfWeek)}
                      disabled={deleteMutation.isPending}
                      className="px-2 py-1 text-red-600 text-xs rounded hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                // 스케줄 없음
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-xs text-gray-400 mb-2">미설정</p>
                  <button
                    onClick={() => handleEdit(dayOfWeek)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                  >
                    + 추가
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 안내 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">주간 스케줄 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 주간 스케줄은 타임슬롯 자동 생성의 템플릿으로 사용됩니다</li>
          <li>• 타임슬롯 탭에서 날짜 범위를 지정하면 이 템플릿을 기반으로 슬롯이 생성됩니다</li>
          <li>• 비활성 요일은 타임슬롯 생성 시 제외됩니다</li>
        </ul>
      </div>

      {/* 마법사 */}
      <WeeklyScheduleWizard
        gameId={gameId}
        existingSchedules={scheduleList}
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default GameWeeklyScheduleTab;
