import React from 'react';
import { Button } from '../common/Button';
import type { Company, Course } from '../../types';

interface GolfCompanyCourseListProps {
  companies: Company[];
  courses: Course[];
  selectedCompanyId: number | null;
  loading: boolean;
  error: string | null;
  onCompanyChange: (companyId: string | number) => void;
  onCourseSelect: (course: Course) => void;
  onAddNewCourse: () => void;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (course: Course) => void;
}

export const GolfCompanyCourseList: React.FC<GolfCompanyCourseListProps> = ({
  companies,
  courses,
  selectedCompanyId,
  loading,
  error,
  onCompanyChange,
  onCourseSelect,
  onAddNewCourse,
  onEditCourse,
  onDeleteCourse,
}) => {
  // 디버깅용 로그 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('GolfCompanyCourseList - courses:', courses);
    console.log('GolfCompanyCourseList - courses.length:', courses.length);
    console.log('GolfCompanyCourseList - selectedCompanyId:', selectedCompanyId);
    console.log('GolfCompanyCourseList - loading:', loading);
    console.log('GolfCompanyCourseList - error:', error);
    console.log('GolfCompanyCourseList - showEmptyMessage:', !loading && !error && courses.length === 0);
  }

  return (
    <div className="space-y-6">
      {/* 회사 선택 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">골프장 선택</h3>
        <div className="max-w-md">
          <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-2">
            골프장을 선택하세요
          </label>
          <select
            id="company-select"
            value={selectedCompanyId || ''}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">골프장을 선택하세요</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 코스 목록 헤더 - 회사가 선택된 경우에만 표시 */}
      {selectedCompanyId && (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            코스 목록 {courses.length > 0 && `(${courses.length}개)`}
          </h2>
          <Button onClick={onAddNewCourse} disabled={loading}>
            ➕ 새 코스 추가
          </Button>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-600">코스 목록을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 코스 테이블 - 회사가 선택된 경우에만 표시 */}
      {selectedCompanyId && !loading && !error && (
        <>
          {courses.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이미지</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">코스명</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주소</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">연락처</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">관리</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                            {course.imageUrl ? (
                              <img 
                                src={course.imageUrl} 
                                alt={course.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : (
                              <div className="text-gray-400 text-xs text-center">
                                없음
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{course.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {course.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {course.address || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {course.phoneNumber || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            course.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {course.status === 'ACTIVE' ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCourseSelect(course);
                              }}
                            >
                              상세
                            </Button>
                            {onEditCourse && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditCourse(course);
                                }}
                              >
                                수정
                              </Button>
                            )}
                            {onDeleteCourse && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCourse(course);
                                }}
                              >
                                삭제
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}

      {/* 빈 상태 메시지 - 회사가 선택된 경우에만 표시 */}
      {selectedCompanyId && !loading && !error && courses.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-md">
          <div className="text-gray-500">
            <div className="text-6xl mb-4">⛳</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">등록된 코스가 없습니다</h4>
            <p className="text-gray-500 mb-4">새 코스를 추가해보세요.</p>
            <button
              onClick={onAddNewCourse}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              첫 번째 코스 추가
            </button>
            {import.meta.env.DEV && (
              <p className="mt-2 text-xs text-red-500">
                [DEBUG] loading:{loading.toString()}, error:{error || 'null'}, courses.length:{courses.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 회사 미선택 안내 메시지 */}
      {!selectedCompanyId && !loading && (
        <div className="text-center py-12 bg-blue-50 rounded-md">
          <div className="text-blue-600">
            <div className="text-6xl mb-4">🏢</div>
            <h4 className="text-lg font-medium text-blue-900 mb-2">골프장을 선택해주세요</h4>
            <p className="text-blue-700 mb-4">위의 드롭다운에서 골프장을 선택하면 코스 목록이 표시됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};