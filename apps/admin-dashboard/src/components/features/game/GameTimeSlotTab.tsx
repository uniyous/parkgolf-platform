import React, { useState, useMemo, useCallback } from 'react';
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

const statusLabels: Record<string, { label: string; color: string; bgColor: string }> = {
  AVAILABLE: { label: '예약가능', color: 'text-green-700', bgColor: 'bg-green-100' },
  FULLY_BOOKED: { label: '예약마감', color: 'text-red-700', bgColor: 'bg-red-100' },
  CLOSED: { label: '종료', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  MAINTENANCE: { label: '정비중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

// 날짜 유틸리티 함수
const formatDate = (date: Date) => date.toISOString().split('T')[0];

const getWeekRange = (baseDate: Date) => {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay()); // 일요일로 이동
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // 토요일
  return { start: formatDate(start), end: formatDate(end) };
};

const addDays = (dateStr: string, days: number) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const GameTimeSlotTab: React.FC<GameTimeSlotTabProps> = ({ gameId }) => {
  // 현재 주 기준 날짜
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [showWizard, setShowWizard] = useState(false);

  // 주간 범위 계산
  const weekRange = useMemo(() => getWeekRange(baseDate), [baseDate]);

  // Query 필터
  const queryFilters = useMemo<GameTimeSlotFilter>(() => ({
    startDate: weekRange.start,
    endDate: weekRange.end,
    limit: 1000, // 일주일치 충분히 커버
  }), [weekRange]);

  const { data: timeSlotsData, isLoading, isFetching, refetch } = useGameTimeSlots(gameId, queryFilters);
  const deleteMutation = useDeleteTimeSlot();
  const updateMutation = useUpdateTimeSlot();

  const timeSlots = timeSlotsData?.data || [];
  const totalCount = timeSlotsData?.pagination?.total || timeSlots.length;

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
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [timeSlots]);

  // 통계
  const stats = useMemo(() => {
    const available = timeSlots.filter(s => s.status === 'AVAILABLE').length;
    const booked = timeSlots.filter(s => s.status === 'FULLY_BOOKED').length;
    const closed = timeSlots.filter(s => s.status === 'CLOSED').length;
    return { available, booked, closed, total: timeSlots.length };
  }, [timeSlots]);

  // 주 이동
  const goToPrevWeek = useCallback(() => {
    setBaseDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setBaseDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  }, []);

  const goToThisWeek = useCallback(() => {
    setBaseDate(new Date());
  }, []);

  // 날짜 접기/펼치기
  const toggleDay = useCallback((date: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }, []);

  // 타임슬롯 삭제
  const handleDelete = async (timeSlotId: number) => {
    if (!window.confirm('이 타임슬롯을 삭제하시겠습니까?')) return;
    try {
      await deleteMutation.mutateAsync({ gameId, timeSlotId });
      refetch();
    } catch (error) {
      console.error('Failed to delete time slot:', error);
      alert('타임슬롯 삭제에 실패했습니다.');
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

  // 주간 날짜 표시 포맷
  const weekLabel = useMemo(() => {
    const start = new Date(weekRange.start);
    const end = new Date(weekRange.end);
    const startMonth = start.getMonth() + 1;
    const endMonth = end.getMonth() + 1;

    if (startMonth === endMonth) {
      return `${start.getFullYear()}년 ${startMonth}월 ${start.getDate()}일 ~ ${end.getDate()}일`;
    }
    return `${startMonth}월 ${start.getDate()}일 ~ ${endMonth}월 ${end.getDate()}일`;
  }, [weekRange]);

  // 오늘 날짜
  const today = formatDate(new Date());
  const isThisWeek = today >= weekRange.start && today <= weekRange.end;

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
            주간 스케줄 기반 타임슬롯 관리
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

      {/* 주간 네비게이션 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          {/* 이전/다음 주 버튼 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="이전 주"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center min-w-[200px]">
              <div className="text-lg font-semibold text-gray-900">{weekLabel}</div>
              <div className="text-xs text-gray-500">
                {weekRange.start} ~ {weekRange.end}
              </div>
            </div>

            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="다음 주"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 빠른 이동 버튼 */}
          <div className="flex items-center space-x-2">
            {!isThisWeek && (
              <button
                onClick={goToThisWeek}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                이번 주
              </button>
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
            >
              {isFetching ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* 통계 */}
        {stats.total > 0 && (
          <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-600">예약가능 {stats.available}개</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              <span className="text-sm text-gray-600">예약마감 {stats.booked}개</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="text-sm text-gray-600">종료 {stats.closed}개</span>
            </div>
            <div className="ml-auto text-sm text-gray-500">
              총 {stats.total}개 슬롯 / {groupedSlots.length}일
            </div>
          </div>
        )}
      </div>

      {/* 타임슬롯 목록 */}
      {groupedSlots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {weekLabel} 타임슬롯이 없습니다
          </h3>
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
        <div className="space-y-4">
          {groupedSlots.map(([date, slots]) => {
            const isCollapsed = collapsedDays.has(date);
            const isToday = date === today;
            const dateObj = new Date(date);
            const dayOfWeek = dateObj.getDay();
            const isSunday = dayOfWeek === 0;
            const isSaturday = dayOfWeek === 6;

            const availableCount = slots.filter(s => s.status === 'AVAILABLE').length;
            const bookedCount = slots.filter(s => s.status === 'FULLY_BOOKED').length;

            return (
              <div
                key={date}
                className={`border rounded-xl overflow-hidden transition-all ${
                  isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                {/* 날짜 헤더 */}
                <button
                  onClick={() => toggleDay(date)}
                  className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                    isToday ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl font-bold ${
                      isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {dateObj.getDate()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          isSunday ? 'text-red-600' : isSaturday ? 'text-blue-600' : 'text-gray-700'
                        }`}>
                          {dateObj.toLocaleDateString('ko-KR', { weekday: 'long' })}
                        </span>
                        {isToday && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded-full">
                            오늘
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {dateObj.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="text-green-600">{availableCount}개 가능</span>
                      {bookedCount > 0 && <span className="text-red-600">{bookedCount}개 마감</span>}
                      <span className="text-gray-500">총 {slots.length}개</span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* 슬롯 그리드 */}
                {!isCollapsed && (
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                      {slots
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((slot) => {
                          const statusInfo = statusLabels[slot.status] || { label: slot.status, color: 'text-gray-600', bgColor: 'bg-gray-100' };

                          return (
                            <div
                              key={slot.id}
                              className={`relative group p-2 rounded-lg border text-center transition-all hover:shadow-md ${
                                slot.status === 'AVAILABLE'
                                  ? 'bg-white border-green-200 hover:border-green-400'
                                  : slot.status === 'FULLY_BOOKED'
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="text-sm font-semibold text-gray-900">
                                {slot.startTime.slice(0, 5)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {slot.currentBookings ?? 0}/{slot.maxBookings ?? 0}
                              </div>
                              <div className={`mt-1 px-1 py-0.5 rounded text-[10px] font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                                {statusInfo.label}
                              </div>

                              {/* 호버 시 액션 버튼 */}
                              <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1">
                                {slot.status === 'AVAILABLE' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(slot.id, 'CLOSED'); }}
                                    className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    종료
                                  </button>
                                )}
                                {slot.status === 'CLOSED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(slot.id, 'AVAILABLE'); }}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    열기
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(slot.id); }}
                                  disabled={deleteMutation.isPending}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  삭제
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
