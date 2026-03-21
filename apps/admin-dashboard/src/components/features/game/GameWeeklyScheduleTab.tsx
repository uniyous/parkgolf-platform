import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  useGameWeeklySchedulesQuery,
  useCreateWeeklyScheduleMutation,
  useUpdateWeeklyScheduleMutation,
  useDeleteWeeklyScheduleMutation,
} from '@/hooks/queries';
import type { GameWeeklySchedule, CreateGameWeeklyScheduleDto, SlotMode } from '@/lib/api/gamesApi';
import { WeeklyScheduleWizard } from './WeeklyScheduleWizard';
import { DeleteConfirmPopover } from '@/components/common';

interface GameWeeklyScheduleTabProps {
  gameId: number;
  slotMode?: SlotMode;
}

const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const dayShortNames = ['일', '월', '화', '수', '목', '금', '토'];

export const GameWeeklyScheduleTab: React.FC<GameWeeklyScheduleTabProps> = ({ gameId, slotMode = 'TEE_TIME' }) => {
  const isSession = slotMode === 'SESSION';

  const defaultSchedule: Omit<CreateGameWeeklyScheduleDto, 'dayOfWeek'> = {
    startTime: isSession ? '08:00' : '06:00',
    endTime: isSession ? '17:00' : '18:00',
    interval: isSession ? 0 : 8,
    isActive: true,
  };

  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateGameWeeklyScheduleDto | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Queries
  const { data: schedules, refetch } = useGameWeeklySchedulesQuery(gameId);
  const createMutation = useCreateWeeklyScheduleMutation();
  const updateMutation = useUpdateWeeklyScheduleMutation();
  const deleteMutation = useDeleteWeeklyScheduleMutation();

  // 스케줄 배열 안전하게 처리
  const scheduleList = Array.isArray(schedules) ? schedules : [];

  // 요일별 스케줄 맵 (복수 스케줄 지원)
  const scheduleMap = new Map<number, GameWeeklySchedule[]>();
  scheduleList.forEach((s) => {
    const existing = scheduleMap.get(s.dayOfWeek) ?? [];
    existing.push(s);
    scheduleMap.set(s.dayOfWeek, existing);
  });

  const handleEdit = (dayOfWeek: number, scheduleId?: number) => {
    if (scheduleId) {
      // 기존 스케줄 수정
      const existing = scheduleList.find(s => s.id === scheduleId);
      if (existing) {
        setFormData({
          dayOfWeek,
          startTime: existing.startTime,
          endTime: existing.endTime,
          interval: existing.interval ?? (isSession ? 0 : 8),
          isActive: existing.isActive,
        });
        setEditingScheduleId(scheduleId);
      }
    } else {
      // 신규 추가
      setFormData({
        ...defaultSchedule,
        dayOfWeek,
      });
      setEditingScheduleId(null);
    }
    setEditingDay(dayOfWeek);
  };

  const handleSave = async () => {
    if (!formData || editingDay === null) return;

    const saveData = isSession
      ? { ...formData, interval: 0 }
      : formData;

    try {
      if (editingScheduleId) {
        await updateMutation.mutateAsync({
          gameId,
          scheduleId: editingScheduleId,
          data: saveData,
        });
      } else {
        await createMutation.mutateAsync({
          gameId,
          data: saveData,
        });
      }
      setEditingDay(null);
      setEditingScheduleId(null);
      setFormData(null);
      refetch();
      toast.success('스케줄이 저장되었습니다.');
    } catch (error) {
      toast.error('스케줄 저장에 실패했습니다.');
    }
  };

  const handleDelete = async (scheduleId: number) => {
    try {
      await deleteMutation.mutateAsync({ gameId, scheduleId });
      refetch();
      toast.success('스케줄이 삭제되었습니다.');
    } catch (error) {
      toast.error('스케줄 삭제에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setEditingDay(null);
    setEditingScheduleId(null);
    setFormData(null);
  };


  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">주간 스케줄</h2>
          <p className="text-sm text-white/50 mt-1">
            {isSession
              ? '요일별 운영 시간대를 설정합니다 (오전/오후 등 세션 단위)'
              : '요일별 운영 시간과 타임슬롯 간격을 설정합니다'}
          </p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center"
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
              index === 0 ? 'text-red-400' : index === 6 ? 'text-emerald-400' : 'text-white/70'
            }`}
          >
            {day}
          </div>
        ))}

        {/* 요일별 스케줄 카드 */}
        {dayNames.map((dayName, dayOfWeek) => {
          const daySchedules = scheduleMap.get(dayOfWeek) ?? [];
          const isEditing = editingDay === dayOfWeek;
          const hasSchedules = daySchedules.length > 0;

          return (
            <div
              key={dayOfWeek}
              className={`border rounded-lg p-3 min-h-[120px] ${
                hasSchedules ? 'bg-white/10 backdrop-blur-xl border-white/15' : 'bg-white/5 border-white/10'
              } ${isEditing ? 'ring-2 ring-emerald-500' : ''}`}
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
                    <span className="text-white/40 text-xs">~</span>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="flex-1 min-w-0 px-1 py-1 text-xs border rounded [&::-webkit-calendar-picker-indicator]:hidden"
                    />
                  </div>
                  {!isSession && (
                    <div className="flex items-center space-x-1">
                      <select
                        value={formData.interval}
                        onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                        className="w-full px-1 py-1 text-xs border rounded"
                      >
                        <option value={7}>7분</option>
                        <option value={8}>8분</option>
                        <option value={10}>10분</option>
                        <option value={15}>15분</option>
                        <option value={20}>20분</option>
                        <option value={30}>30분</option>
                        <option value={60}>60분</option>
                      </select>
                    </div>
                  )}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-1"
                    />
                    <span className="text-xs text-white/60">활성화</span>
                  </div>
                  <div className="flex space-x-1 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-500 disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-2 py-1 border text-white/60 text-xs rounded hover:bg-white/5"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : hasSchedules ? (
                // 스케줄 있음 (복수)
                <div className="space-y-2">
                  {daySchedules.map((schedule) => (
                    <div key={schedule.id} className="space-y-1">
                      <div className="text-xs font-medium text-white">
                        {schedule.startTime} ~ {schedule.endTime}
                      </div>
                      {isSession ? (
                        <div className="text-xs text-purple-400">세션</div>
                      ) : (
                        <div className="text-xs text-white/50">
                          {schedule.interval ?? 8}분 간격
                        </div>
                      )}
                      {!schedule.isActive && (
                        <span className="inline-block px-1.5 py-0.5 bg-white/10 text-white/60 text-xs rounded">
                          비활성
                        </span>
                      )}
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(dayOfWeek, schedule.id)}
                          className="flex-1 px-2 py-1 bg-white/10 text-white/70 text-xs rounded hover:bg-white/15"
                        >
                          수정
                        </button>
                        <DeleteConfirmPopover
                          message={`${dayName} ${schedule.startTime}~${schedule.endTime} 스케줄을 삭제하시겠습니까?`}
                          isDeleting={deleteMutation.isPending}
                          onConfirm={() => handleDelete(schedule.id)}
                          side="top"
                          align="center"
                        >
                          <button
                            className="px-2 py-1 text-red-400 text-xs rounded hover:bg-red-500/10"
                          >
                            삭제
                          </button>
                        </DeleteConfirmPopover>
                      </div>
                    </div>
                  ))}
                  {/* 같은 요일에 세션 추가 버튼 */}
                  <button
                    onClick={() => handleEdit(dayOfWeek)}
                    className="w-full px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded hover:bg-emerald-500/20 border border-dashed border-emerald-500/30"
                  >
                    + 추가
                  </button>
                </div>
              ) : (
                // 스케줄 없음
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-xs text-white/40 mb-2">미설정</p>
                  <button
                    onClick={() => handleEdit(dayOfWeek)}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded hover:bg-emerald-500/20"
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
      <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg">
        <h3 className="text-sm font-medium text-emerald-300 mb-2">
          주간 스케줄 안내 {isSession ? '(세션 모드)' : '(티타임 모드)'}
        </h3>
        <ul className="text-sm text-emerald-400 space-y-1">
          {isSession ? (
            <>
              <li>• 세션 모드에서는 스케줄 1건당 타임슬롯 1개가 생성됩니다 (예: 오전 08:00~12:00)</li>
              <li>• 오전/오후 등 시간대를 나누어 등록하면 세션별로 슬롯이 구분됩니다</li>
              <li>• 비활성 요일은 타임슬롯 생성 시 제외됩니다</li>
            </>
          ) : (
            <>
              <li>• 주간 스케줄은 타임슬롯 자동 생성의 템플릿으로 사용됩니다</li>
              <li>• 타임슬롯 탭에서 날짜 범위를 지정하면 이 템플릿을 기반으로 슬롯이 생성됩니다</li>
              <li>• 비활성 요일은 타임슬롯 생성 시 제외됩니다</li>
            </>
          )}
        </ul>
      </div>

      {/* 마법사 */}
      <WeeklyScheduleWizard
        gameId={gameId}
        slotMode={slotMode}
        existingSchedules={scheduleList}
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default GameWeeklyScheduleTab;
