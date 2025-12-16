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
      {/* 회사/골프장 선택 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">골프장 선택</h3>
        
        {/* 항상 카드 그리드 패턴 사용 */}
        <div>
          <p className="text-sm text-gray-600 mb-4">관리할 골프장을 선택하세요</p>
          <div className={`grid gap-4 ${
            companies.length === 1 ? 'grid-cols-1 max-w-md' :
            companies.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            companies.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            companies.length <= 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
            companies.length <= 6 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
              {companies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => onCompanyChange(company.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCompanyChange(company.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selectedCompanyId === company.id}
                  aria-label={`${company.name} 골프장 선택`}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    selectedCompanyId === company.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                      selectedCompanyId === company.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      ⛳
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm truncate ${
                        selectedCompanyId === company.id ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {company.name}
                      </h4>
                      <p className={`text-xs mt-1 ${
                        selectedCompanyId === company.id ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        골프장 관리
                      </p>
                    </div>
                    {selectedCompanyId === company.id && (
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                      <tr 
                        key={course.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => onCourseSelect(course)}
                      >
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
                          <div className="flex justify-end space-x-1">
                            {onEditCourse && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditCourse(course);
                                }}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="수정"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            {onDeleteCourse && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCourse(course);
                                }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="삭제"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
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