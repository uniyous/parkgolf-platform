import React, { useState, useMemo } from 'react';
import {
  useGameTimeSlots,
  useDeleteTimeSlot,
  useUpdateTimeSlot,
} from '@/hooks/queries';
import type { GameTimeSlot, GameTimeSlotFilter, UpdateGameTimeSlotDto } from '@/lib/api/gamesApi';
import { TimeSlotWizard } from './TimeSlotWizard';

interface GameTimeSlotTabProps {
  gameId: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: '예약가능', color: 'bg-green-100 text-green-800' },
  FULLY_BOOKED: { label: '예약마감', color: 'bg-red-100 text-red-800' },
  CLOSED: { label: '종료', color: 'bg-gray-100 text-gray-800' },
  MAINTENANCE: { label: '정비중', color: 'bg-yellow-100 text-yellow-800' },
};

export const GameTimeSlotTab: React.FC<GameTimeSlotTabProps> = ({ gameId }) => {
  // 필터 상태
  const [filters, setFilters] = useState<GameTimeSlotFilter>({
    page: 1,
    limit: 50,
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // 생성 마법사 상태
  const [showWizard, setShowWizard] = useState(false);

  // Queries
  const queryFilters = useMemo(() => ({
    ...filters,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [filters, dateRange]);

  const { data: timeSlotsData, isLoading, refetch } = useGameTimeSlots(gameId, queryFilters);
  const deleteMutation = useDeleteTimeSlot();
  const updateMutation = useUpdateTimeSlot();

  const timeSlots = timeSlotsData?.data || [];
  const pagination = timeSlotsData?.pagination;

  // 날짜별 그룹화
  const groupedSlots = useMemo(() => {
    const groups = new Map<string, GameTimeSlot[]>();
    timeSlots.forEach((slot) => {
      const date = slot.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(slot);
    });
    // 날짜순 정렬
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [timeSlots]);

  // 타임슬롯 삭제
  const handleDelete = async (timeSlotId: number) => {
    const confirmed = window.confirm('이 타임슬롯을 삭제하시겠습니까?');
    if (confirmed) {
      try {
        await deleteMutation.mutateAsync({ gameId, timeSlotId });
        refetch();
      } catch (error) {
        console.error('Failed to delete time slot:', error);
        alert('타임슬롯 삭제에 실패했습니다.');
      }
    }
  };

  // 타임슬롯 상태 변경
  const handleStatusChange = async (timeSlotId: number, status: string) => {
    try {
      await updateMutation.mutateAsync({
        gameId,
        timeSlotId,
        data: { status: status as UpdateGameTimeSlotDto['status'] },
      });
      refetch();
    } catch (error) {
      console.error('Failed to update time slot:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">타임슬롯 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            {pagination?.total || 0}개의 타임슬롯
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>타임슬롯 생성</span>
        </button>
      </div>

      {/* 필터 */}
      <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">조회 기간:</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
        >
          조회
        </button>
      </div>

      {/* 타임슬롯 목록 */}
      {groupedSlots.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">타임슬롯이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            주간 스케줄을 설정한 후 타임슬롯을 생성해주세요
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              타임슬롯 생성하기
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSlots.map(([date, slots]) => (
            <div key={date} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">
                  {new Date(date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </h3>
                <p className="text-sm text-gray-500">{slots.length}개 슬롯</p>
              </div>

              {/* 슬롯 그리드 */}
              <div className="p-4 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {slots
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-2 rounded-lg border text-center ${
                        slot.status === 'AVAILABLE'
                          ? 'bg-white border-green-200 hover:border-green-400'
                          : slot.status === 'FULLY_BOOKED'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {slot.startTime}
                      </div>
                      <div className="text-xs text-gray-500">
                        {slot.currentBookings}/{slot.maxBookings}
                      </div>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                        statusLabels[slot.status]?.color || 'bg-gray-100 text-gray-600'
                      }`}>
                        {statusLabels[slot.status]?.label || slot.status}
                      </span>
                      {slot.price && (
                        <div className="text-xs text-blue-600 mt-1">
                          ₩{slot.price.toLocaleString()}
                        </div>
                      )}
                      {/* 액션 버튼 */}
                      <div className="mt-2 flex justify-center space-x-1">
                        {slot.status === 'AVAILABLE' && (
                          <button
                            onClick={() => handleStatusChange(slot.id, 'CLOSED')}
                            className="px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                            title="종료 처리"
                          >
                            종료
                          </button>
                        )}
                        {slot.status === 'CLOSED' && (
                          <button
                            onClick={() => handleStatusChange(slot.id, 'AVAILABLE')}
                            className="px-1.5 py-0.5 text-xs text-green-600 hover:text-green-800"
                            title="다시 열기"
                          >
                            열기
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={deleteMutation.isPending}
                          className="px-1.5 py-0.5 text-xs text-red-500 hover:text-red-700"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 생성 마법사 */}
      <TimeSlotWizard
        gameId={gameId}
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

export default GameTimeSlotTab;
