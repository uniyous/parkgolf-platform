import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, UpdateCourseDto, Hole } from '@/types';
import type { TimeSlot } from '@/types/timeslot';
import { courseApi } from '@/lib/api/courseApi';
import { HoleFormModal } from './HoleFormModal';
import { TimeSlotCard } from '@/components/features/timeslot/TimeSlotCard';
import { useBreadcrumb } from '@/stores';

interface CourseDetailViewProps {
  course: Course;
  loading: boolean;
  error: string | null;
  onBackToCourseList: () => void;
  onUpdateCourse: (courseId: number, data: UpdateCourseDto) => Promise<boolean>;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  loading,
  error,
  onBackToCourseList,
}) => {
  const navigate = useNavigate();
  const { updateLast } = useBreadcrumb();
  const [holes, setHoles] = useState<Hole[]>([]);
  const [holesLoading, setHolesLoading] = useState(false);
  const [holesError, setHolesError] = useState<string | null>(null);
  
  // 홀 관리 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHole, setSelectedHole] = useState<Hole | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 타임슬롯 관련 상태
  const [todayTimeSlots, setTodayTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  // 홀 데이터 가져오기
  const fetchHoles = async () => {
    if (!course?.id) return;
    
    setHolesLoading(true);
    setHolesError(null);
    
    try {
      const holesData = await courseApi.getHolesByCourse(course.id);
      setHoles(holesData);
    } catch (error: any) {
      // API에서 반환된 구체적인 에러 메시지 사용
      const errorMessage = error?.message || '홀 정보를 불러오는데 실패했습니다.';
      setHolesError(errorMessage);
      console.error('Failed to fetch holes:', error);
    } finally {
      setHolesLoading(false);
    }
  };

  // 오늘 타임슬롯 가져오기
  const fetchTodayTimeSlots = async () => {
    if (!course?.id) return;
    
    setTimeSlotsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const timeSlots = await courseApi.getTimeSlots({
        courseId: course.id,
        date: today
      });
      setTodayTimeSlots(timeSlots.slice(0, 6)); // 최대 6개만 표시
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
    } finally {
      setTimeSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchHoles();
    fetchTodayTimeSlots();
  }, [course?.id]);

  // 코스 정보가 변경될 때 breadcrumb 업데이트
  useEffect(() => {
    if (course?.name) {
      updateLast({ label: course.name, icon: '🏌️' });
    }
  }, [course?.name, updateLast]); // useCallback으로 안정화된 updateLast 사용

  // 홀 관리 함수들
  const handleAddHole = () => {
    setShowAddModal(true);
  };

  const handleEditHole = (hole: Hole) => {
    setSelectedHole(hole);
    setShowEditModal(true);
  };

  const handleDeleteHole = (hole: Hole) => {
    setSelectedHole(hole);
    setShowDeleteConfirm(true);
  };

  // 홀 추가
  const handleAddHoleSave = async (holeData: any) => {
    try {
      await courseApi.createHole(course.id, holeData);
      await fetchHoles();
      return true;
    } catch (error) {
      console.error('Failed to create hole:', error);
      setHolesError('홀 추가에 실패했습니다.');
      return false;
    }
  };

  // 홀 수정
  const handleEditHoleSave = async (holeData: any) => {
    if (!selectedHole) return false;
    
    try {
      await courseApi.updateHole(course.id, selectedHole.id, holeData);
      await fetchHoles();
      return true;
    } catch (error) {
      console.error('Failed to update hole:', error);
      setHolesError('홀 수정에 실패했습니다.');
      return false;
    }
  };

  // 홀 삭제
  const confirmDeleteHole = async () => {
    if (!selectedHole || !course?.id) return;
    
    try {
      await courseApi.deleteHole(course.id, selectedHole.id);
      await fetchHoles();
      setShowDeleteConfirm(false);
      setSelectedHole(null);
    } catch (error) {
      console.error('Failed to delete hole:', error);
      setHolesError('홀 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 액션 버튼들 */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBackToCourseList}
          className="inline-flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          코스 목록으로
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/courses/${course.id}/timeslots`)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            타임슬롯 관리
          </button>
          <button
            onClick={() => navigate(`/courses/${course.id}/bookings`)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            예약 관리
          </button>
        </div>
      </div>

      {/* 골프장 개요 정보 레이어 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{course.name}</h3>
                <p className="text-sm text-gray-600">{course.description || '골프장 설명이 없습니다'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gray-700">{course.address || '주소 정보 없음'}</span>
              </div>
              
              {course.phoneNumber && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-gray-700">{course.phoneNumber}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-gray-700">
                  총 {holes.length}홀 
                  {holes.length > 0 && (
                    <span className="ml-2 text-gray-500">
                      (평균 Par {(holes.reduce((sum, hole) => sum + hole.par, 0) / holes.length).toFixed(1)})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">상태</div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                course.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {course.status === 'ACTIVE' ? '운영중' : course.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 타임슬롯 섹션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              오늘의 타임슬롯
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
          <button
            onClick={() => navigate(`/courses/${course.id}/timeslots`)}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            전체 관리
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {timeSlotsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">타임슬롯을 불러오는 중...</p>
          </div>
        ) : todayTimeSlots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayTimeSlots.map(slot => (
              <TimeSlotCard
                key={slot.id}
                timeSlot={slot}
                variant="compact"
                onClick={() => setSelectedTimeSlot(slot)}
                isSelected={selectedTimeSlot?.id === slot.id}
                showActions={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">오늘 예약 가능한 타임슬롯이 없습니다.</p>
            <button
              onClick={() => navigate(`/courses/${course.id}/timeslots`)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              타임슬롯 추가
            </button>
          </div>
        )}
        
        {/* 선택된 타임슬롯 상세 정보 */}
        {selectedTimeSlot && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900">선택된 타임슬롯</h4>
              <button
                onClick={() => setSelectedTimeSlot(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">시간:</span>
                <p className="font-medium text-blue-900">
                  {selectedTimeSlot.startTime.substring(0, 5)} - {selectedTimeSlot.endTime.substring(0, 5)}
                </p>
              </div>
              <div>
                <span className="text-blue-700">예약 현황:</span>
                <p className="font-medium text-blue-900">
                  {selectedTimeSlot.bookedSlots}/{selectedTimeSlot.maxSlots}팀
                </p>
              </div>
              <div>
                <span className="text-blue-700">가격:</span>
                <p className="font-medium text-blue-900">
                  ₩{selectedTimeSlot.price.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-blue-700">상태:</span>
                <p className="font-medium text-blue-900">
                  {selectedTimeSlot.status === 'ACTIVE' ? '예약 가능' : '예약 불가'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 홀 목록 섹션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">홀 목록 ({holes.length}개)</h3>
          <button 
            onClick={handleAddHole}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            홀 추가
          </button>
        </div>

        {/* 에러 메시지 */}
        {holesError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {holesError}
          </div>
        )}
        
        {holesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">홀 정보를 불러오는 중...</p>
          </div>
        ) : holes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이미지</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">홀 번호</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">파</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">거리 (m)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">설명</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">작업</th>
                </tr>
              </thead>
              <tbody>
                {holes.map((hole) => (
                  <tr key={hole.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                        {hole.imageUrl ? (
                          <img 
                            src={hole.imageUrl} 
                            alt={`${hole.holeNumber}번 홀 이미지`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-full h-full flex items-center justify-center text-gray-400 text-xs ${hole.imageUrl ? 'hidden' : 'flex'}`}
                        >
                          이미지<br/>없음
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                          {hole.holeNumber}
                        </div>
                        <span className="ml-2">{hole.holeNumber}번 홀</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Par {hole.par}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {hole.distance ? `${hole.distance}m` : '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {hole.description || '-'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleEditHole(hole)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="수정"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteHole(hole)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">⛳</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">아직 등록된 홀이 없습니다</h4>
            <p className="text-gray-500 mb-4">홀 추가 버튼을 클릭하여 첫 번째 홀을 추가하세요.</p>
            <button
              onClick={handleAddHole}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              첫 번째 홀 추가
            </button>
          </div>
        )}
      </div>

      {/* 홀 추가 모달 */}
      <HoleFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddHoleSave}
        courseId={course.id}
        mode="create"
      />

      {/* 홀 수정 모달 */}
      <HoleFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedHole(null);
        }}
        onSubmit={handleEditHoleSave}
        hole={selectedHole}
        courseId={course.id}
        mode="edit"
      />

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && selectedHole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">홀 삭제</h3>
            <div className="mb-6">
              <p className="text-gray-600">
                <strong>{selectedHole.holeNumber}번 홀</strong>을 삭제하시겠습니까?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedHole(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDeleteHole}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>처리 중...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};