import React, { useState } from 'react';
import type { Club, Course, CourseCombo, CreateCourseDto } from '@/types/club';
import { useClub } from '@/hooks';

interface CourseManagementTabProps {
  club: Club;
  courses: Course[];
  combos: CourseCombo[];
  onCoursesUpdate: (courses: Course[]) => void;
  onCombosUpdate: (combos: CourseCombo[]) => void;
}

export const CourseManagementTab: React.FC<CourseManagementTabProps> = ({
  club,
  courses,
  combos,
  onCoursesUpdate,
  onCombosUpdate
}) => {
  const { loading } = useClub();
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // 새 코스 추가 폼
  const [newCourse, setNewCourse] = useState<CreateCourseDto>({
    clubId: club.id,
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
      alert('코스명과 코드는 필수 항목입니다.');
      return;
    }

    try {
      // For now, keep the direct API call since we don't have course creation in Redux yet
      // This will be implemented in the course-service side
      alert('코스 생성 기능은 향후 구현 예정입니다.');
      setShowAddCourse(false);
    } catch (error) {
      console.error('Failed to create course:', error);
      alert('코스 생성에 실패했습니다.');
    }
  };

  // 코스 삭제
  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm('정말로 이 코스를 삭제하시겠습니까?')) return;

    try {
      // For now, keep the direct API call since we don't have course deletion in Redux yet
      alert('코스 삭제 기능은 향후 구현 예정입니다.');
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('코스 삭제에 실패했습니다.');
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
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-gray-600 mt-3 text-sm">{course.description}</p>
                  )}
                </div>

                {/* 홀별 정보 - 항상 표시 */}
                <div className="p-4 bg-gray-50">
                    {course.holes && course.holes.length > 0 ? (
                      <>
                        {/* 홀 카드 그리드 */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                          {[...course.holes].sort((a, b) => a.holeNumber - b.holeNumber).map((hole) => (
                            <div
                              key={hole.id}
                              className="bg-white rounded-lg border border-gray-200 p-2 hover:shadow-md transition-shadow"
                            >
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
                      <p className="text-gray-500 text-center py-6">홀 정보가 등록되지 않았습니다.</p>
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
    </div>
  );
};