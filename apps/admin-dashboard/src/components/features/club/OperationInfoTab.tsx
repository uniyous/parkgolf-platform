import React, { useState, useEffect } from 'react';
import type { Club, ClubStats, ComboAnalytics } from '@/types/club';
import { useClub } from '@/hooks';

interface OperationInfoTabProps {
  club: Club;
  onUpdate: (updatedClub: Club) => void;
}

export const OperationInfoTab: React.FC<OperationInfoTabProps> = ({ club, onUpdate }) => {
  const { loading, updateExistingClub } = useClub();
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [analytics, setAnalytics] = useState<ComboAnalytics[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [availability, setAvailability] = useState<{available: number, total: number} | null>(null);

  // 통계 데이터 로드
  const loadStats = async () => {
    try {
      // Mock data for now - will be replaced with real API calls later
      const mockStats: ClubStats = {
        totalBookings: 150,
        totalRevenue: 45000000,
        averageUtilization: 75,
        monthlyRevenue: 15000000,
        topCourses: ['A코스', 'B코스'],
        peakTimes: ['10:00', '14:00']
      };
      
      const mockAnalytics: ComboAnalytics[] = [
        {
          comboId: 1,
          comboName: 'A+B 조합',
          totalSlots: 20,
          bookedSlots: 15,
          utilizationRate: 75,
          averagePrice: 120000,
          totalRevenue: 1800000,
          weekdayBookings: 8,
          weekendBookings: 7,
          peakHours: ['10:00', '14:00', '16:00']
        }
      ];

      const mockAvailability = {
        available: 12,
        total: 20
      };

      setStats(mockStats);
      setAnalytics(mockAnalytics);
      setAvailability(mockAvailability);
    } catch (error) {
      console.error('Failed to load operation data:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [club.id, dateRange]);

  // 가동률 색상
  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100';
    if (rate >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  // 시즌 정보 업데이트
  const updateSeasonInfo = async (seasonData: any) => {
    try {
      const result = await updateExistingClub(club.id, {
        seasonInfo: seasonData
      });
      if (result) {
        onUpdate(result);
      } else {
        alert('시즌 정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update season info:', error);
      alert('시즌 정보 업데이트에 실패했습니다.');
    }
  };

  if (loading.detail && !stats && !analytics.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">운영 정보</h2>
          <p className="text-gray-600 mt-1">골프장 운영 현황 및 통계를 확인하세요</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <label className="text-gray-700">분석 기간:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1"
            />
            <span className="text-gray-500">~</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <button
            onClick={loadStats}
            disabled={loading.detail}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 실시간 현황 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">오늘 예약 가능</p>
              <p className="text-2xl font-bold text-blue-900">
                {availability ? `${availability.available}/${availability.total}` : '-/-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">운영 상태</p>
              <p className="text-lg font-semibold text-green-900">
                {club.status === 'ACTIVE' ? '정상 운영' :
                 club.status === 'MAINTENANCE' ? '정비중' :
                 club.status === 'SEASONAL_CLOSED' ? '휴장' : '비활성'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              club.status === 'ACTIVE' ? 'bg-green-200' : 'bg-yellow-200'
            }`}>
              <svg className={`w-6 h-6 ${club.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700">평균 가동률</p>
              <p className="text-2xl font-bold text-purple-900">
                {stats?.averageUtilization ? `${Math.round(stats.averageUtilization)}%` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">월 수익</p>
              <p className="text-2xl font-bold text-orange-900">
                {stats?.monthlyRevenue ? `${(stats.monthlyRevenue / 1000000).toFixed(1)}M` : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 18홀 조합별 분석 */}
      {analytics.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">18홀 조합별 성과 분석</h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">조합</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">총 슬롯</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">예약</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">가동률</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">평균 가격</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">수익</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">인기 시간</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.map((combo) => (
                    <tr key={combo.comboId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{combo.comboName}</div>
                        <div className="text-sm text-gray-500">ID: {combo.comboId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {combo.totalSlots}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{combo.bookedSlots}</div>
                        <div className="text-xs text-gray-500">
                          주중: {combo.weekdayBookings} / 주말: {combo.weekendBookings}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUtilizationColor(combo.utilizationRate)}`}>
                          {Math.round(combo.utilizationRate)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        ₩{combo.averagePrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        ₩{(combo.totalRevenue / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-xs text-gray-600">
                          {combo.peakHours.slice(0, 3).join(', ')}
                          {combo.peakHours.length > 3 && '...'}
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
        <h3 className="text-lg font-medium text-gray-900">시즌 정보</h3>
        <div className="bg-gray-50 rounded-lg p-6">
          {club.seasonInfo ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-medium font-semibold text-gray-900">
                    현재 시즌: {
                      club.seasonInfo.type === 'peak' ? '성수기' :
                      club.seasonInfo.type === 'regular' ? '정수기' : '비수기'
                    }
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {club.seasonInfo.startDate} ~ {club.seasonInfo.endDate}
                  </p>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  club.seasonInfo.type === 'peak' ? 'bg-red-100 text-red-800' :
                  club.seasonInfo.type === 'regular' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {club.seasonInfo.type === 'peak' ? '🔥 성수기' :
                   club.seasonInfo.type === 'regular' ? '📅 정수기' :
                   '🌱 비수기'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">시즌 정보 없음</h3>
              <p className="mt-1 text-sm text-gray-500">시즌별 운영 정보를 설정하면 더 나은 분석이 가능합니다.</p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    const seasonType = prompt('시즌 유형을 선택하세요 (peak/regular/off):', 'regular');
                    if (seasonType && ['peak', 'regular', 'off'].includes(seasonType)) {
                      const startDate = prompt('시작일 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                      const endDate = prompt('종료일 (YYYY-MM-DD):', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                      if (startDate && endDate) {
                        updateSeasonInfo({
                          type: seasonType,
                          startDate,
                          endDate
                        });
                      }
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  시즌 정보 설정
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 운영 팁 */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-medium text-blue-900 mb-4">💡 운영 개선 제안</h3>
        <div className="space-y-3 text-sm text-blue-800">
          {analytics.length > 0 && (
            <>
              {analytics.some(a => a.utilizationRate < 50) && (
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
                  </svg>
                  <p>가동률이 낮은 조합이 있습니다. 할인 이벤트나 패키지 상품을 고려해보세요.</p>
                </div>
              )}
              {analytics.some(a => a.utilizationRate > 90) && (
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>인기 조합의 타임슬롯을 늘리거나 프리미엄 가격을 적용할 수 있습니다.</p>
                </div>
              )}
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 mt-0.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>정기적인 분석을 통해 고객 선호도 변화를 모니터링하고 운영 전략을 조정하세요.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};