import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClub } from '../../redux/hooks/useClub';
import type { CourseCombo } from '../../types/club';
import { CourseManagementTab } from '../../components/club/CourseManagementTab';
import { BasicInfoTab } from '../../components/club/BasicInfoTab';
import { OperationInfoTab } from '../../components/club/OperationInfoTab';

type TabType = 'basic' | 'courses' | 'operation';

export const ClubDetailPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [combos, setCombos] = useState<CourseCombo[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Redux hooks
  const {
    selectedClub,
    selectedClubCourses,
    loading,
    errors,
    loadClubById,
    selectClub,
    updateExistingClub,
    removeClub,
  } = useClub();

  // 골프장 정보 조회
  useEffect(() => {
    if (clubId) {
      const id = Number(clubId);
      loadClubById(id); // 이미 courses 데이터가 포함됨
    }
  }, [clubId, loadClubById]);

  // TODO: 18홀 조합 조회 추가 (향후 구현)
  useEffect(() => {
    if (selectedClubCourses.length >= 2) {
      // 18홀 조합 생성 로직 추가
      // const combosData = await clubApi.getCombosForClub(Number(clubId));
      // setCombos(combosData);
    }
  }, [selectedClubCourses]);

  // 탭 변경 시 편집 모드 리셋
  useEffect(() => {
    if (activeTab !== 'basic') {
      setEditMode(false);
    }
  }, [activeTab]);

  // 타임슬롯 관리로 이동
  const handleGoToTimeSlots = () => {
    navigate(`/club/clubs/${clubId}/timeslots`);
  };

  // 골프장 수정
  const handleEditClub = () => {
    setActiveTab('basic');
    setEditMode(true);
  };

  // 골프장 삭제
  const handleDeleteClub = async () => {
    if (!selectedClub || isDeleting) return;
    
    const confirmed = window.confirm(
      `"${selectedClub.name}" 골프장을 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 연관된 모든 데이터가 함께 삭제됩니다.`
    );
    
    if (confirmed) {
      setIsDeleting(true);
      try {
        await removeClub(selectedClub.id);
        alert('골프장이 성공적으로 삭제되었습니다.');
        navigate('/club');
      } catch (error) {
        console.error('Failed to delete club:', error);
        alert('골프장 삭제 중 오류가 발생했습니다.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  if (loading.detail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errors.detail || !selectedClub) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">골프장 정보를 찾을 수 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            {errors.detail || '골프장 정보를 불러오는 중 문제가 발생했습니다.'}
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/club')}
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
              onClick={() => navigate('/club')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{selectedClub.name}</h1>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-gray-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {selectedClub.location}
                </p>
                <p className="text-gray-600">⛳ {selectedClub.totalHoles}홀</p>
                <p className="text-gray-600">🎯 {selectedClub.totalCourses}코스</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedClub.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : selectedClub.status === 'MAINTENANCE'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedClub.status === 'ACTIVE' ? '운영중' : selectedClub.status === 'MAINTENANCE' ? '정비중' : '휴장'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleGoToTimeSlots}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>타임슬롯</span>
            </button>
            <button 
              onClick={handleEditClub}
              className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              title="골프장 수정"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button 
              onClick={handleDeleteClub}
              disabled={isDeleting}
              className="p-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isDeleting ? "삭제 중..." : "골프장 삭제"}
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
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === 'courses'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900'
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
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-600 hover:text-gray-900'
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
      <div className="bg-white rounded-lg border border-gray-200">
        {activeTab === 'basic' && (
          <BasicInfoTab club={selectedClub} onUpdate={selectClub} initialEditMode={editMode} />
        )}
        {activeTab === 'courses' && (
          <CourseManagementTab 
            club={selectedClub} 
            courses={selectedClubCourses} 
            combos={combos}
            onCoursesUpdate={() => loadClubById(Number(clubId))}
            onCombosUpdate={setCombos}
          />
        )}
        {activeTab === 'operation' && (
          <OperationInfoTab club={selectedClub} onUpdate={selectClub} />
        )}
      </div>

    </div>
  );
};