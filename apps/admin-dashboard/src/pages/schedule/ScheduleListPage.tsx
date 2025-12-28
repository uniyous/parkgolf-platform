import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGames, useClubs, useGameTimeSlotStats } from '@/hooks/queries';

export const ScheduleListPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  // Queries
  const { data: clubsData } = useClubs();
  const { data: gamesData, isLoading: gamesLoading } = useGames({ clubId: selectedClubId || undefined });
  const { data: stats } = useGameTimeSlotStats();

  const clubs = clubsData?.data || [];
  const games = gamesData?.data || [];

  // 클럽 이름 조회
  const getClubName = (clubId: number) => {
    const club = clubs.find((c) => c.id === clubId);
    return club?.name || `Club ${clubId}`;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📆 타임슬롯 관리</h1>
            <p className="text-gray-600 mt-1">전체 타임슬롯 현황 및 관리</p>
          </div>
        </div>

        {/* 통계 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.totalSlots}</p>
              <p className="text-sm text-blue-700">전체 슬롯</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.availableSlots}</p>
              <p className="text-sm text-green-700">예약 가능</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.bookedSlots}</p>
              <p className="text-sm text-red-700">예약 완료</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.utilizationRate}%</p>
              <p className="text-sm text-purple-700">이용률</p>
            </div>
          </div>
        )}

        {/* 클럽 필터 */}
        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-600">골프장:</label>
          <select
            value={selectedClubId || ''}
            onChange={(e) => setSelectedClubId(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 골프장</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 라운드별 타임슬롯 현황 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">라운드별 현황</h2>

        {gamesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">라운드가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              먼저 라운드를 등록해주세요
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/games')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                라운드 관리로 이동
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <div
                key={game.id}
                onClick={() => navigate(`/games/${game.id}`)}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{game.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    game.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {game.status === 'ACTIVE' ? '운영중' : '비활성'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {getClubName(game.clubId)}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    ₩{game.price.toLocaleString()}
                  </span>
                  <span className="text-blue-600 hover:text-blue-800">
                    타임슬롯 관리 →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">타임슬롯 관리 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 개별 라운드의 타임슬롯은 라운드 상세 페이지에서 관리합니다</li>
          <li>• 라운드 카드를 클릭하면 해당 라운드의 주간 스케줄 및 타임슬롯을 관리할 수 있습니다</li>
          <li>• 새 라운드는 <span className="font-medium">라운드 관리</span> 메뉴에서 추가할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
};

export default ScheduleListPage;
