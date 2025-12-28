import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame, useDeleteGame } from '@/hooks/queries';
import { GameBasicInfoTab } from '@/components/features/game/GameBasicInfoTab';
import { GameWeeklyScheduleTab } from '@/components/features/game/GameWeeklyScheduleTab';
import { GameTimeSlotTab } from '@/components/features/game/GameTimeSlotTab';

type TabType = 'basic' | 'weeklySchedule' | 'timeSlots';

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '운영중', color: 'bg-green-100 text-green-800' },
  INACTIVE: { label: '비활성', color: 'bg-gray-100 text-gray-800' },
  MAINTENANCE: { label: '정비중', color: 'bg-yellow-100 text-yellow-800' },
};

export const GameDetailPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const { data: game, error, refetch } = useGame(Number(gameId));
  const deleteGameMutation = useDeleteGame();

  // 게임 삭제
  const handleDeleteGame = async () => {
    if (!game || isDeleting) return;

    const confirmed = window.confirm(
      `"${game.name}" 라운드를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 연관된 타임슬롯 데이터가 함께 삭제됩니다.`
    );

    if (confirmed) {
      setIsDeleting(true);
      try {
        await deleteGameMutation.mutateAsync(game.id);
        alert('라운드가 성공적으로 삭제되었습니다.');
        navigate('/games');
      } catch (error) {
        console.error('Failed to delete game:', error);
        alert('라운드 삭제 중 오류가 발생했습니다.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // game이 없거나 id가 없는 경우 에러로 처리
  if (error || !game || !game.id) {
    console.log('[GameDetailPage] Error or no game:', { error, game });
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">라운드 정보를 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error?.message || '라운드 정보를 불러오는 중 문제가 발생했습니다.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Game ID: {gameId}
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/games')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/games')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{game.name || '라운드'}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-gray-600 flex items-center">
                  👥 최대 {game.maxPlayers ?? '-'}명
                </p>
                <p className="text-gray-600">⏱️ {game.duration ?? '-'}분</p>
                <p className="text-gray-600 font-medium text-blue-600">
                  ₩{(game.price ?? 0).toLocaleString()}
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  statusLabels[game.status]?.color || 'bg-gray-100 text-gray-800'
                }`}>
                  {statusLabels[game.status]?.label || game.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeleteGame}
              disabled={isDeleting}
              className="p-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isDeleting ? '삭제 중...' : '라운드 삭제'}
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-700"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'basic'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>기본정보</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('weeklySchedule')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'weeklySchedule'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>주간 스케줄</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('timeSlots')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'timeSlots'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>타임슬롯</span>
            </div>
          </button>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {activeTab === 'basic' && (
          <GameBasicInfoTab game={game} onUpdate={refetch} />
        )}
        {activeTab === 'weeklySchedule' && (
          <GameWeeklyScheduleTab gameId={game.id} />
        )}
        {activeTab === 'timeSlots' && (
          <GameTimeSlotTab gameId={game.id} />
        )}
      </div>
    </div>
  );
};

export default GameDetailPage;
