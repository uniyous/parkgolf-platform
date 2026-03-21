import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useClubDetail } from '@/hooks';
import { DataContainer, DeleteConfirmPopover } from '@/components/common';
import { PageLayout } from '@/components/layout';
import type { CourseCombo } from '@/types/club';
import { CourseManagementTab } from '@/components/features/club/CourseManagementTab';
import { BasicInfoTab } from '@/components/features/club/BasicInfoTab';
import { OperationInfoTab } from '@/components/features/club/OperationInfoTab';

type TabType = 'basic' | 'courses' | 'operation';

export const ClubDetailPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [combos, setCombos] = useState<CourseCombo[]>([]);
  const [editMode, setEditMode] = useState(false);

  // useClubDetail 훅으로 모든 데이터/액션 관리
  const {
    club,
    courses,
    stats,
    isLoading,
    isCoursesLoading,
    isDeletingClub,
    error,
    deleteClub,
    refetchClub,
    refetchCourses,
  } = useClubDetail(clubId ? Number(clubId) : null);

  const breadcrumbs = useMemo(() => [
    { label: '골프장', path: '/clubs' },
    { label: club?.name || '골프장 상세' },
  ], [club?.name]);

  // 탭 변경 시 편집 모드 리셋
  useEffect(() => {
    if (activeTab !== 'basic') {
      setEditMode(false);
    }
  }, [activeTab]);

  // 라운드 관리로 이동
  const handleGoToGames = () => {
    navigate(`/games?clubId=${clubId}`);
  };

  // 골프장 수정
  const handleEditClub = () => {
    setActiveTab('basic');
    setEditMode(true);
  };

  // 골프장 삭제
  const handleDeleteClub = async () => {
    if (!club || isDeletingClub) return;

    try {
      await deleteClub();
      toast.success('골프장이 성공적으로 삭제되었습니다.');
    } catch (error) {
      toast.error('골프장 삭제 중 오류가 발생했습니다.');
    }
  };

  // 코스 업데이트 핸들러
  const handleCoursesUpdate = async () => {
    await refetchCourses();
  };

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
    <DataContainer
      isLoading={isLoading}
      isEmpty={!club && !isLoading}
      emptyIcon={
        <svg className="h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
        </svg>
      }
      emptyMessage="골프장 정보를 찾을 수 없습니다"
      emptyDescription={error || '골프장 정보를 불러오는 중 문제가 발생했습니다.'}
      emptyAction={
        <button
          onClick={() => navigate('/clubs')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
        >
          목록으로 돌아가기
        </button>
      }
      loadingMessage="골프장 정보를 불러오는 중..."
      className="min-h-[16rem]"
    >
      {club && (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/clubs')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{club.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-white/60 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {club.location}
                </p>
                <p className="text-white/60">⛳ {stats.totalHoles || club.totalHoles || 0}홀</p>
                <p className="text-white/60">🎯 {stats.totalCourses || club.totalCourses || 0}코스</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  club.status === 'ACTIVE'
                    ? 'bg-green-500/20 text-green-400'
                    : club.status === 'MAINTENANCE'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {club.status === 'ACTIVE' ? '운영중' : club.status === 'MAINTENANCE' ? '정비중' : '휴장'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  club.clubType === 'FREE'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {club.clubType === 'FREE' ? '무료' : '유료'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoToGames}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>라운드 보기</span>
            </button>
            <button
              onClick={handleEditClub}
              className="p-2 border border-white/15 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
              title="골프장 수정"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <DeleteConfirmPopover
              targetName={club.name}
              message={`"${club.name}" 골프장을 삭제하시겠습니까? 연관된 모든 데이터가 함께 삭제됩니다.`}
              isDeleting={isDeletingClub}
              onConfirm={handleDeleteClub}
              side="bottom"
              align="end"
            >
              <button
                className="p-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-500/10 transition-colors"
                title="골프장 삭제"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </DeleteConfirmPopover>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 border-b border-white/15">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'basic'
                ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-500'
                : 'text-white/60 hover:text-white'
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
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'courses'
                ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <span>코스관리</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('operation')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'operation'
                ? 'bg-emerald-500/10 text-emerald-300 border-b-2 border-emerald-500'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>운영정보</span>
            </div>
          </button>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15">
        {activeTab === 'basic' && (
          <BasicInfoTab club={club} onUpdate={refetchClub} initialEditMode={editMode} />
        )}
        {activeTab === 'courses' && (
          <CourseManagementTab
            club={club}
            courses={courses}
            combos={combos}
            isLoading={isCoursesLoading}
            onCoursesUpdate={handleCoursesUpdate}
            onCombosUpdate={setCombos}
          />
        )}
        {activeTab === 'operation' && (
          <OperationInfoTab club={club} onUpdate={refetchClub} />
        )}
      </div>
    </div>
      )}
    </DataContainer>
    </PageLayout>
  );
};
