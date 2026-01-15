import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Club, Course, CourseCombo, CreateCourseDto } from '@/types/club';
import type { UpdateCourseDto, Hole, CreateHoleDto, UpdateHoleDto } from '@/types';
import { useUpdateCourseMutation, useDeleteCourseMutation, useCreateHoleMutation, useUpdateHoleMutation, useDeleteHoleMutation } from '@/hooks/queries/course';
import { DeleteConfirmPopover } from '@/components/common';

interface CourseManagementTabProps {
  club: Club;
  courses: Course[];
  combos: CourseCombo[];
  isLoading?: boolean;
  onCoursesUpdate: () => void | Promise<void>;
  onCombosUpdate: (combos: CourseCombo[]) => void;
}

export const CourseManagementTab: React.FC<CourseManagementTabProps> = ({
  club,
  courses,
  combos,
  isLoading = false,
  onCoursesUpdate,
  onCombosUpdate
}) => {
  const updateCourseMutation = useUpdateCourseMutation();
  const deleteCourseMutation = useDeleteCourseMutation();
  const createHoleMutation = useCreateHoleMutation();
  const updateHoleMutation = useUpdateHoleMutation();
  const deleteHoleMutation = useDeleteHoleMutation();

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // 홀 관리 상태
  const [selectedHole, setSelectedHole] = useState<{ courseId: number; hole: Hole } | null>(null);
  const [showAddHole, setShowAddHole] = useState<number | null>(null); // courseId to add hole to
  const [newHole, setNewHole] = useState<Omit<CreateHoleDto, 'courseId'>>({
    holeNumber: 1,
    par: 4,
    distance: 350,
    description: ''
  });
  const [editHole, setEditHole] = useState<UpdateHoleDto>({});

  // 수정 폼 상태
  const [editCourse, setEditCourse] = useState<UpdateCourseDto>({});

  // selectedCourse가 변경되면 editCourse 초기화
  useEffect(() => {
    if (selectedCourse) {
      setEditCourse({
        name: selectedCourse.name,
        code: selectedCourse.code || '',
        subtitle: selectedCourse.subtitle || '',
        par: selectedCourse.par || 36,
        totalDistance: selectedCourse.totalDistance || 3200,
        difficulty: selectedCourse.difficulty || 3,
        scenicRating: selectedCourse.scenicRating || 3,
        description: selectedCourse.description || ''
      });
    }
  }, [selectedCourse]);

  // selectedHole이 변경되면 editHole 초기화
  useEffect(() => {
    if (selectedHole) {
      setEditHole({
        holeNumber: selectedHole.hole.holeNumber,
        par: selectedHole.hole.par,
        distance: selectedHole.hole.distance,
        description: selectedHole.hole.description || ''
      });
    }
  }, [selectedHole]);

  // 홀 추가 모달 열 때 기본값 설정
  useEffect(() => {
    if (showAddHole !== null) {
      const course = courses.find(c => c.id === showAddHole);
      const existingHoles = course?.holes?.length || 0;
      setNewHole({
        holeNumber: existingHoles + 1,
        par: 4,
        distance: 350,
        description: ''
      });
    }
  }, [showAddHole, courses]);

  // 새 코스 추가 폼
  const [newCourse, setNewCourse] = useState<CreateCourseDto>({
    golfClubId: club.id,
    companyId: club.companyId,
    name: '',
    code: '',
    subtitle: '',
    par: 36,
    totalDistance: 3200,
    difficulty: 3,
    scenicRating: 3,
    description: ''
  });

  // 코스 추가
  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.code) {
      toast.error('코스명과 코드는 필수 항목입니다.');
      return;
    }

    try {
      // For now, keep the direct API call since we don't have course creation in Redux yet
      // This will be implemented in the course-service side
      toast.info('코스 생성 기능은 향후 구현 예정입니다.');
      setShowAddCourse(false);
    } catch (error) {
      console.error('Failed to create course:', error);
      toast.error('코스 생성에 실패했습니다.');
    }
  };

  // 코스 수정
  const handleUpdateCourse = async () => {
    if (!selectedCourse || !editCourse.name || !editCourse.code) {
      toast.error('코스명과 코드는 필수 항목입니다.');
      return;
    }

    try {
      await updateCourseMutation.mutateAsync({
        id: selectedCourse.id,
        data: editCourse
      });

      // react-query 캐시 무효화 후 refetch
      await onCoursesUpdate();

      setSelectedCourse(null);
      toast.success('코스가 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error('코스 수정에 실패했습니다.');
    }
  };

  // 코스 삭제
  const handleDeleteCourse = async (courseId: number) => {
    try {
      await deleteCourseMutation.mutateAsync(courseId);

      // react-query 캐시 무효화 후 refetch
      await onCoursesUpdate();

      toast.success('코스가 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error('코스 삭제에 실패했습니다.');
    }
  };

  // 홀 추가
  const handleAddHole = async () => {
    if (showAddHole === null) return;

    if (!newHole.holeNumber || !newHole.par) {
      toast.error('홀 번호와 Par는 필수 항목입니다.');
      return;
    }

    try {
      await createHoleMutation.mutateAsync({
        courseId: showAddHole,
        data: {
          ...newHole,
          courseId: showAddHole
        }
      });

      // react-query 캐시 무효화 후 refetch
      await onCoursesUpdate();

      setShowAddHole(null);
      toast.success('홀이 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('Failed to create hole:', error);
      toast.error('홀 추가에 실패했습니다.');
    }
  };

  // 홀 수정
  const handleUpdateHole = async () => {
    if (!selectedHole) return;

    if (!editHole.holeNumber || !editHole.par) {
      toast.error('홀 번호와 Par는 필수 항목입니다.');
      return;
    }

    try {
      await updateHoleMutation.mutateAsync({
        courseId: selectedHole.courseId,
        holeId: selectedHole.hole.id,
        data: editHole
      });

      // react-query 캐시 무효화 후 refetch
      await onCoursesUpdate();

      setSelectedHole(null);
      toast.success('홀이 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('Failed to update hole:', error);
      toast.error('홀 수정에 실패했습니다.');
    }
  };

  // 홀 삭제
  const handleDeleteHole = async (courseId: number, holeId: number) => {
    try {
      await deleteHoleMutation.mutateAsync({ courseId, holeId });

      // react-query 캐시 무효화 후 refetch
      await onCoursesUpdate();

      toast.success('홀이 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete hole:', error);
      toast.error('홀 삭제에 실패했습니다.');
    }
  };

  // 난이도 표시
  const getDifficultyStars = (difficulty: number) => {
    return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">코스 목록</h2>
          <p className="text-gray-600 mt-1">9홀 단위로 코스를 관리하고 18홀 조합을 확인하세요</p>
        </div>
        <button
          onClick={() => setShowAddCourse(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>새 코스 추가</span>
        </button>
      </div>

      {/* 코스 목록 */}
      <div className="space-y-4">
        
        {courses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">코스가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">첫 번째 9홀 코스를 추가해보세요.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                {/* 코스 헤더 */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-white">{course.code}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold text-gray-900 truncate">
                          {course.name}
                          {course.subtitle && (
                            <span className="ml-2 text-base font-normal text-gray-500">({course.subtitle})</span>
                          )}
                        </h4>
                        <div className="flex items-center flex-wrap gap-3 mt-2">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            Par {course.par}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {course.totalDistance}m
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                            난이도 {getDifficultyStars(course.difficulty || 0)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            경치 {getDifficultyStars(course.scenicRating || 0)}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            {course.holeCount || course.holes?.length || 0}홀
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 ml-4">
                      <button
                        onClick={() => setSelectedCourse(course)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="수정"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <DeleteConfirmPopover
                        targetName={course.name}
                        message={`"${course.name}" 코스를 삭제하시겠습니까? 해당 코스의 모든 홀 정보가 함께 삭제됩니다.`}
                        isDeleting={deleteCourseMutation.isPending}
                        onConfirm={() => handleDeleteCourse(course.id)}
                        side="left"
                        align="start"
                      >
                        <button
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </DeleteConfirmPopover>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-gray-600 mt-3 text-sm">{course.description}</p>
                  )}
                </div>

                {/* 홀별 정보 - 항상 표시 */}
                <div className="p-4 bg-gray-50">
                    {/* 홀 관리 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-700">홀 정보</h5>
                      <button
                        onClick={() => setShowAddHole(course.id)}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>홀 추가</span>
                      </button>
                    </div>

                    {course.holes && course.holes.length > 0 ? (
                      <>
                        {/* 홀 카드 그리드 */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                          {[...course.holes].sort((a, b) => a.holeNumber - b.holeNumber).map((hole) => (
                            <div
                              key={hole.id}
                              className="bg-white rounded-lg border border-gray-200 p-2 hover:shadow-md transition-shadow group relative"
                            >
                              {/* 수정/삭제 버튼 - 호버 시 표시 */}
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-0.5">
                                <button
                                  onClick={() => setSelectedHole({ courseId: course.id, hole })}
                                  className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                  title="수정"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteHole(course.id, hole.id)}
                                  className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                  title="삭제"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>

                              {/* 홀 번호 */}
                              <div className="text-center mb-1">
                                <span className="text-lg font-bold text-blue-600">{hole.holeNumber}</span>
                                <span className="text-xs text-gray-400 ml-0.5">H</span>
                              </div>

                              {/* Par */}
                              <div className="flex justify-center mb-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                  hole.par === 3 ? 'bg-green-500' :
                                  hole.par === 4 ? 'bg-blue-500' :
                                  hole.par === 5 ? 'bg-purple-500' :
                                  'bg-gray-500'
                                }`}>
                                  {hole.par}
                                </div>
                              </div>

                              {/* 거리 */}
                              <div className="text-center">
                                <p className="text-xs font-semibold text-gray-700">{hole.distance}m</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 요약 정보 */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-green-500"></span>
                              <span className="text-gray-600">Par3: {course.holes.filter(h => h.par === 3).length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                              <span className="text-gray-600">Par4: {course.holes.filter(h => h.par === 4).length}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                              <span className="text-gray-600">Par5: {course.holes.filter(h => h.par === 5).length}</span>
                            </div>
                            <div className="text-gray-600">
                              총 Par: <span className="font-semibold">{course.holes.reduce((sum, h) => sum + h.par, 0)}</span>
                            </div>
                            <div className="text-gray-600">
                              총 거리: <span className="font-semibold">{course.holes.reduce((sum, h) => sum + h.distance, 0)}m</span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500 mb-3">홀 정보가 등록되지 않았습니다.</p>
                        <button
                          onClick={() => setShowAddHole(course.id)}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          첫 번째 홀 추가하기
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* 코스 추가 모달 */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">새 코스 추가 (9홀)</h3>
              <button
                onClick={() => setShowAddCourse(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">코스명 *</label>
                  <input
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="A코스, Lake코스 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">코드 *</label>
                  <input
                    type="text"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="A, B, C, D"
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부제목</label>
                <input
                  type="text"
                  value={newCourse.subtitle || ''}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Lake, Ocean, Valley 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Par (9홀 합계)</label>
                  <input
                    type="number"
                    value={newCourse.par}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, par: Number(e.target.value) }))}
                    min={27}
                    max={45}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">총 거리 (m)</label>
                  <input
                    type="number"
                    value={newCourse.totalDistance}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, totalDistance: Number(e.target.value) }))}
                    min={2000}
                    max={5000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                  <select
                    value={newCourse.difficulty}
                    onChange={(e) => setNewCourse(prev => ({ ...prev, difficulty: Number(e.target.value) as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - 매우 쉬움</option>
                    <option value={2}>2 - 쉬움</option>
                    <option value={3}>3 - 보통</option>
                    <option value={4}>4 - 어려움</option>
                    <option value={5}>5 - 매우 어려움</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경치 점수</label>
                <select
                  value={newCourse.scenicRating}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, scenicRating: Number(e.target.value) as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 - 보통</option>
                  <option value={2}>2 - 좋음</option>
                  <option value={3}>3 - 매우 좋음</option>
                  <option value={4}>4 - 우수</option>
                  <option value={5}>5 - 최고</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={newCourse.description || ''}
                  onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="코스 특징이나 주의사항 등을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddCourse(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddCourse}
                disabled={!newCourse.name || !newCourse.code}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <span>추가</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 코스 수정 모달 */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">코스 수정</h3>
                <p className="text-sm text-gray-500 mt-1">코스 정보를 수정합니다</p>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">코스명 *</label>
                  <input
                    type="text"
                    value={editCourse.name || ''}
                    onChange={(e) => setEditCourse(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="A코스, Lake코스 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">코드 *</label>
                  <input
                    type="text"
                    value={editCourse.code || ''}
                    onChange={(e) => setEditCourse(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="A, B, C, D"
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">부제목</label>
                <input
                  type="text"
                  value={editCourse.subtitle || ''}
                  onChange={(e) => setEditCourse(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Lake, Ocean, Valley 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Par (9홀 합계)</label>
                  <input
                    type="number"
                    value={editCourse.par || 36}
                    onChange={(e) => setEditCourse(prev => ({ ...prev, par: Number(e.target.value) }))}
                    min={27}
                    max={45}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">총 거리 (m)</label>
                  <input
                    type="number"
                    value={editCourse.totalDistance || 3200}
                    onChange={(e) => setEditCourse(prev => ({ ...prev, totalDistance: Number(e.target.value) }))}
                    min={2000}
                    max={5000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">난이도</label>
                  <select
                    value={editCourse.difficulty || 3}
                    onChange={(e) => setEditCourse(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>1 - 매우 쉬움</option>
                    <option value={2}>2 - 쉬움</option>
                    <option value={3}>3 - 보통</option>
                    <option value={4}>4 - 어려움</option>
                    <option value={5}>5 - 매우 어려움</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경치 점수</label>
                <select
                  value={editCourse.scenicRating || 3}
                  onChange={(e) => setEditCourse(prev => ({ ...prev, scenicRating: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1 - 보통</option>
                  <option value={2}>2 - 좋음</option>
                  <option value={3}>3 - 매우 좋음</option>
                  <option value={4}>4 - 우수</option>
                  <option value={5}>5 - 최고</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={editCourse.description || ''}
                  onChange={(e) => setEditCourse(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="코스 특징이나 주의사항 등을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 홀 정보 요약 (읽기 전용) */}
              {selectedCourse.holes && selectedCourse.holes.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">홀 정보 (총 {selectedCourse.holes.length}홀)</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Par3: {selectedCourse.holes.filter(h => h.par === 3).length}개</span>
                    <span>Par4: {selectedCourse.holes.filter(h => h.par === 4).length}개</span>
                    <span>Par5: {selectedCourse.holes.filter(h => h.par === 5).length}개</span>
                    <span className="text-gray-400">|</span>
                    <span>총 Par: {selectedCourse.holes.reduce((sum, h) => sum + h.par, 0)}</span>
                    <span>총 거리: {selectedCourse.holes.reduce((sum, h) => sum + h.distance, 0)}m</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">* 홀 정보는 별도의 홀 관리 메뉴에서 수정할 수 있습니다.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateCourse}
                disabled={!editCourse.name || !editCourse.code || updateCourseMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {updateCourseMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>저장 중...</span>
                  </>
                ) : (
                  <span>저장</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 홀 추가 모달 */}
      {showAddHole !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">새 홀 추가</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {courses.find(c => c.id === showAddHole)?.name} 코스에 홀을 추가합니다
                </p>
              </div>
              <button
                onClick={() => setShowAddHole(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">홀 번호 *</label>
                  <input
                    type="number"
                    value={newHole.holeNumber}
                    onChange={(e) => setNewHole(prev => ({ ...prev, holeNumber: Number(e.target.value) }))}
                    min={1}
                    max={18}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Par *</label>
                  <select
                    value={newHole.par}
                    onChange={(e) => setNewHole(prev => ({ ...prev, par: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={3}>Par 3</option>
                    <option value={4}>Par 4</option>
                    <option value={5}>Par 5</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">거리 (m)</label>
                <input
                  type="number"
                  value={newHole.distance}
                  onChange={(e) => setNewHole(prev => ({ ...prev, distance: Number(e.target.value) }))}
                  min={50}
                  max={1000}
                  placeholder="350"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={newHole.description || ''}
                  onChange={(e) => setNewHole(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="홀의 특징이나 공략 포인트 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddHole(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddHole}
                disabled={!newHole.holeNumber || !newHole.par || createHoleMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {createHoleMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>추가 중...</span>
                  </>
                ) : (
                  <span>추가</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 홀 수정 모달 */}
      {selectedHole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">홀 수정</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {courses.find(c => c.id === selectedHole.courseId)?.name} 코스 - {selectedHole.hole.holeNumber}번 홀
                </p>
              </div>
              <button
                onClick={() => setSelectedHole(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">홀 번호 *</label>
                  <input
                    type="number"
                    value={editHole.holeNumber || ''}
                    onChange={(e) => setEditHole(prev => ({ ...prev, holeNumber: Number(e.target.value) }))}
                    min={1}
                    max={18}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Par *</label>
                  <select
                    value={editHole.par || 4}
                    onChange={(e) => setEditHole(prev => ({ ...prev, par: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={3}>Par 3</option>
                    <option value={4}>Par 4</option>
                    <option value={5}>Par 5</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">거리 (m)</label>
                <input
                  type="number"
                  value={editHole.distance || ''}
                  onChange={(e) => setEditHole(prev => ({ ...prev, distance: Number(e.target.value) }))}
                  min={50}
                  max={1000}
                  placeholder="350"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={editHole.description || ''}
                  onChange={(e) => setEditHole(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="홀의 특징이나 공략 포인트 등"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setSelectedHole(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateHole}
                disabled={!editHole.holeNumber || !editHole.par || updateHoleMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {updateHoleMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>저장 중...</span>
                  </>
                ) : (
                  <span>저장</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};