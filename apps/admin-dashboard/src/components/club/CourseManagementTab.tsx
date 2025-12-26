import React, { useState } from 'react';
import type { Club, Course, CourseCombo, CreateCourseDto } from '../../types/club';
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
  const [showHoles, setShowHoles] = useState<{ [courseId: number]: boolean }>({});

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

  // 홀 정보 토글
  const toggleHoles = async (course: Course) => {
    const isShowing = showHoles[course.id];
    setShowHoles(prev => ({
      ...prev,
      [course.id]: !isShowing
    }));

    if (!isShowing && (!course.holes || course.holes.length === 0)) {
      try {
        // For now, simulate holes data
        const mockHoles = Array.from({ length: 9 }, (_, i) => ({
          id: i + 1,
          holeNumber: i + 1,
          par: 3 + Math.floor(Math.random() * 3),
          distance: 120 + Math.floor(Math.random() * 200),
          handicap: i + 1
        }));
        
        const updatedCourses = courses.map(c => 
          c.id === course.id ? { ...c, holes: mockHoles } : c
        );
        onCoursesUpdate(updatedCourses);
      } catch (error) {
        console.error('Failed to fetch holes:', error);
      }
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
          <h2 className="text-xl font-semibold text-gray-900">코스 관리</h2>
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

      {/* 현황 카드 */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">⛳ {club.totalHoles}</p>
            <p className="text-sm text-gray-600">총 홀</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">🎯 {courses.length}</p>
            <p className="text-sm text-gray-600">코스 수</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">🏌️ {combos.length}</p>
            <p className="text-sm text-gray-600">18홀 조합</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">💡 {Math.round(courses.reduce((sum, c) => sum + c.difficulty, 0) / courses.length) || 0}</p>
            <p className="text-sm text-gray-600">평균 난이도</p>
          </div>
        </div>
      </div>

      {/* 코스 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">등록된 코스 ({courses.length}개)</h3>
        
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
              <div key={course.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600">{course.code}</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {course.name}
                          {course.subtitle && (
                            <span className="ml-2 text-sm text-gray-500">({course.subtitle})</span>
                          )}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>Par {course.par}</span>
                          <span>{course.totalDistance}m</span>
                          <span>난이도: {getDifficultyStars(course.difficulty)}</span>
                          <span>경치: {getDifficultyStars(course.scenicRating)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleHoles(course)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="홀 정보 보기"
                      >
                        <svg className={`w-5 h-5 transition-transform ${showHoles[course.id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
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
                    <p className="text-gray-600 mb-4">{course.description}</p>
                  )}

                  {/* 홀 정보 - 카드 형태 */}
                  {showHoles[course.id] && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900">홀별 정보</h5>
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span>총 Par: <span className="font-semibold text-gray-900">{course.par}</span></span>
                          <span>총 거리: <span className="font-semibold text-gray-900">{course.totalDistance}m</span></span>
                        </div>
                      </div>
                      
                      {course.holes && course.holes.length > 0 ? (
                        <>
                          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                            {[...course.holes].sort((a, b) => a.holeNumber - b.holeNumber).map((hole) => (
                              <div 
                                key={hole.id} 
                                className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer group"
                              >
                                {/* 홀 번호 */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-gray-700">Hole</span>
                                  <span className="text-lg font-bold text-blue-600">{hole.holeNumber}</span>
                                </div>
                                
                                {/* Par 표시 */}
                                <div className="mb-2">
                                  <div className="flex items-center justify-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                      hole.par === 3 ? 'bg-green-500' : 
                                      hole.par === 4 ? 'bg-blue-500' : 
                                      hole.par === 5 ? 'bg-purple-500' : 
                                      'bg-gray-500'
                                    }`}>
                                      {hole.par}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 text-center mt-1">Par</p>
                                </div>
                                
                                {/* 거리 */}
                                <div className="text-center mb-2">
                                  <p className="text-sm font-semibold text-gray-900">{hole.distance}m</p>
                                  <p className="text-xs text-gray-500">거리</p>
                                </div>
                                
                                {/* 핸디캡 */}
                                <div className="text-center border-t border-gray-100 pt-2">
                                  <div className="flex items-center justify-center">
                                    <span className="text-xs text-gray-500">HC</span>
                                    <span className="text-xs font-semibold text-gray-700 ml-1">{hole.handicap}</span>
                                  </div>
                                </div>
                                
                                {/* Tee Box 정보 (있는 경우) */}
                                {hole.teeBoxes && hole.teeBoxes.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-xs font-medium text-gray-600 mb-1">티박스</p>
                                    {hole.teeBoxes.slice(0, 2).map((teeBox) => (
                                      <div key={teeBox.id} className="flex items-center justify-between">
                                        <span className={`text-xs px-1 py-0.5 rounded ${
                                          teeBox.color === 'WHITE' ? 'bg-gray-100' :
                                          teeBox.color === 'BLUE' ? 'bg-blue-100' :
                                          teeBox.color === 'RED' ? 'bg-red-100' :
                                          'bg-gray-100'
                                        }`}>
                                          {teeBox.name}
                                        </span>
                                        <span className="text-xs text-gray-600">{teeBox.distance}m</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-center">
                                <p className="text-xs text-gray-500">파3 홀</p>
                                <p className="text-lg font-bold text-green-600">
                                  {course.holes.filter(h => h.par === 3).length}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">파4 홀</p>
                                <p className="text-lg font-bold text-blue-600">
                                  {course.holes.filter(h => h.par === 4).length}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">파5 홀</p>
                                <p className="text-lg font-bold text-purple-600">
                                  {course.holes.filter(h => h.par === 5).length}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">평균 거리</p>
                                <p className="text-lg font-bold text-gray-700">
                                  {Math.round(course.holes.reduce((sum, h) => sum + h.distance, 0) / course.holes.length)}m
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-gray-500 text-center py-4">홀 정보가 등록되지 않았습니다.</p>
                      )}
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
    </div>
  );
};