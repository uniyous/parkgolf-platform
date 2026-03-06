import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Club, SeasonType } from '@/types/club';
import { useUpdateClubMutation } from '@/hooks/queries';
import { bookingApi, type ClubOperationStats } from '@/lib/api/bookingApi';

interface OperationInfoTabProps {
  club: Club;
  onUpdate: (updatedClub: Club) => void;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface SeasonFormData {
  type: SeasonType;
  startDate: string;
  endDate: string;
}

export const OperationInfoTab: React.FC<OperationInfoTabProps> = ({ club, onUpdate }) => {
  const updateClubMutation = useUpdateClubMutation();
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [seasonForm, setSeasonForm] = useState<SeasonFormData>({
    type: club.seasonInfo?.type ?? 'regular',
    startDate: club.seasonInfo?.startDate ?? new Date().toISOString().split('T')[0],
    endDate: club.seasonInfo?.endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // React Query로 운영 통계 데이터 조회
  const {
    data: operationData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['club-operation-stats', club.id, dateRange],
    queryFn: () => bookingApi.getClubOperationStats(club.id, dateRange),
    staleTime: 5 * 60 * 1000, // 5분
  });

  const stats = operationData?.stats ?? null;
  const analytics = operationData?.analytics ?? [];
  const availability = operationData?.availability ?? null;

  // 시즌 정보 업데이트
  const updateSeasonInfo = async (seasonData: SeasonFormData) => {
    try {
      const result = await updateClubMutation.mutateAsync({
        id: club.id,
        data: { seasonInfo: seasonData },
      });
      if (result) {
        onUpdate(result);
      }
      setShowSeasonModal(false);
    } catch (error) {
      console.error('Failed to update season info:', error);
    }
  };

  const openSeasonModal = () => {
    setSeasonForm({
      type: club.seasonInfo?.type ?? 'regular',
      startDate: club.seasonInfo?.startDate ?? new Date().toISOString().split('T')[0],
      endDate: club.seasonInfo?.endDate ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setShowSeasonModal(true);
  };

  if (isLoading && !stats && !analytics.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">운영 정보</h2>
          <p className="text-white/60 mt-1">골프장 운영 현황 및 통계를 확인하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <label className="text-white/70">분석 기간:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-white/15 rounded px-2 py-1"
            />
            <span className="text-white/50">~</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-white/15 rounded px-2 py-1"
            />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 실시간 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-300">오늘 예약</p>
              <p className="text-2xl font-bold text-white">
                {availability ? `${availability.bookedToday}건` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-300">운영 상태</p>
              <p className="text-lg font-semibold text-white">
                {club.status === 'ACTIVE' ? '정상 운영' :
                 club.status === 'MAINTENANCE' ? '정비중' :
                 club.status === 'SEASONAL_CLOSED' ? '휴장' : '비활성'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              club.status === 'ACTIVE' ? 'bg-green-500/20' : 'bg-yellow-500/20'
            }`}>
              <svg className={`w-6 h-6 ${club.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-300">평균 가동률</p>
              <p className="text-2xl font-bold text-white">
                {stats?.averageUtilization ? `${Math.round(stats.averageUtilization)}%` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-lg p-4 border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-300">월 수익</p>
              <p className="text-2xl font-bold text-white">
                {stats?.monthlyRevenue ? `${(stats.monthlyRevenue / 1000000).toFixed(1)}M` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 18홀 조합별 분석 */}
      {analytics.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">게임별 성과 분석</h3>
          <div className="bg-white/10 backdrop-blur-xl border border-white/15 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/15">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider">게임</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">예약 건수</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">주중/주말</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">평균 가격</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">수익</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-white/50 uppercase tracking-wider">인기 시간</th>
                  </tr>
                </thead>
                <tbody className="bg-white/10 divide-y divide-white/15">
                  {analytics.map((game) => (
                    <tr key={game.gameId} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{game.gameName}</div>
                        <div className="text-sm text-white/50">슬롯 {game.bookedSlots}개 사용</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">
                        {game.totalBookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-xs text-white/60">
                          주중: {game.weekdayBookings} / 주말: {game.weekendBookings}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">
                        {game.averagePrice.toLocaleString()}원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">
                        {(game.totalRevenue / 10000).toFixed(0)}만원
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-xs text-white/60">
                          {game.peakHours.slice(0, 3).join(', ') || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 시즌 정보 관리 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">시즌 정보</h3>
          {club.seasonInfo && (
            <button
              onClick={openSeasonModal}
              className="px-3 py-1.5 text-sm bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors"
            >
              수정
            </button>
          )}
        </div>
        <div className="bg-white/5 rounded-lg p-6">
          {club.seasonInfo ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-medium font-semibold text-white">
                    현재 시즌: {
                      club.seasonInfo.type === 'peak' ? '성수기' :
                      club.seasonInfo.type === 'regular' ? '정수기' : '비수기'
                    }
                  </h4>
                  <p className="text-sm text-white/60 mt-1">
                    {club.seasonInfo.startDate} ~ {club.seasonInfo.endDate}
                  </p>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  club.seasonInfo.type === 'peak' ? 'bg-red-500/20 text-red-300' :
                  club.seasonInfo.type === 'regular' ? 'bg-emerald-500/20 text-emerald-300' :
                  'bg-blue-500/20 text-blue-300'
                }`}>
                  {club.seasonInfo.type === 'peak' ? '성수기' :
                   club.seasonInfo.type === 'regular' ? '정수기' :
                   '비수기'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-white">시즌 정보 없음</h3>
              <p className="mt-1 text-sm text-white/50">시즌별 운영 정보를 설정하면 더 나은 분석이 가능합니다.</p>
              <div className="mt-6">
                <button
                  onClick={openSeasonModal}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  시즌 정보 설정
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 운영 팁 */}
      <div className="bg-emerald-500/10 rounded-lg p-6 border border-emerald-500/30">
        <h3 className="text-lg font-medium text-white mb-4">운영 개선 제안</h3>
        <div className="space-y-3 text-sm text-emerald-300">
          {analytics.length > 0 && (
            <>
              {stats && stats.averageUtilization < 50 && (
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
                  </svg>
                  <p>전체 가동률이 낮습니다. 할인 이벤트나 패키지 상품을 고려해보세요.</p>
                </div>
              )}
              {stats && stats.averageUtilization > 90 && (
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>가동률이 매우 높습니다. 타임슬롯 추가나 프리미엄 가격을 고려해보세요.</p>
                </div>
              )}
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>정기적인 분석을 통해 고객 선호도 변화를 모니터링하고 운영 전략을 조정하세요.</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 시즌 정보 설정 모달 */}
      {showSeasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowSeasonModal(false)} />
          <div className="relative bg-gray-900 border border-white/15 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">시즌 정보 설정</h3>
              <button
                onClick={() => setShowSeasonModal(false)}
                className="text-white/50 hover:text-white/80 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">시즌 유형</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'peak', label: '성수기', color: 'red' },
                    { value: 'regular', label: '정수기', color: 'emerald' },
                    { value: 'off', label: '비수기', color: 'blue' },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSeasonForm(prev => ({ ...prev, type: option.value }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        seasonForm.type === option.value
                          ? option.color === 'red'
                            ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                            : option.color === 'emerald'
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                              : 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                          : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">시작일</label>
                <input
                  type="date"
                  value={seasonForm.startDate}
                  onChange={(e) => setSeasonForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">종료일</label>
                <input
                  type="date"
                  value={seasonForm.endDate}
                  onChange={(e) => setSeasonForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSeasonModal(false)}
                className="px-4 py-2 text-sm text-white/70 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => updateSeasonInfo(seasonForm)}
                disabled={updateClubMutation.isPending || !seasonForm.startDate || !seasonForm.endDate}
                className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {updateClubMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
