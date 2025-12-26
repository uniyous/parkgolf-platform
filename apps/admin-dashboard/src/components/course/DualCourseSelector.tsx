import React from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';

interface Course {
  id: number;
  name: string;
  description?: string;
  holes?: number;
  totalPar?: number;
}

interface Company {
  id: number;
  name: string;
  description?: string;
}

interface DualCourseSelectorProps {
  companies: Company[];
  courses: Course[];
  companiesLoading?: boolean;
  coursesLoading?: boolean;
  selectedCompanyId: number | null;
  selectedFrontCourseId: number | null;
  selectedBackCourseId: number | null;
  onCompanyChange: (companyId: number | null) => void;
  onFrontCourseChange: (courseId: number | null) => void;
  onBackCourseChange: (courseId: number | null) => void;
  onReset?: () => void;
}

export const DualCourseSelector: React.FC<DualCourseSelectorProps> = ({
  companies,
  courses,
  companiesLoading = false,
  coursesLoading = false,
  selectedCompanyId,
  selectedFrontCourseId,
  selectedBackCourseId,
  onCompanyChange,
  onFrontCourseChange,
  onBackCourseChange,
  onReset,
}) => {
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onCompanyChange(value ? Number(value) : null);
  };

  const handleFrontCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFrontCourseChange(value ? Number(value) : null);
  };

  const handleBackCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onBackCourseChange(value ? Number(value) : null);
  };

  const isSelectionComplete = selectedCompanyId && selectedFrontCourseId && selectedBackCourseId;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          18홀 라운딩 코스 선택
        </h3>
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            초기화
          </button>
        )}
      </div>

      {/* Company Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          운영 회사 선택
        </label>
        <select
          value={selectedCompanyId || ''}
          onChange={handleCompanyChange}
          disabled={companiesLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">
            {companiesLoading ? '로딩 중...' : '회사를 선택하세요'}
          </option>
          {Array.isArray(companies) && companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
              {company.description && ` - ${company.description}`}
            </option>
          ))}
        </select>
      </div>

      {/* Course Selection - Only show if company is selected */}
      {selectedCompanyId && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-3">
            ※ 18홀 라운딩을 위해 전반 9홀과 후반 9홀 코스를 선택해주세요
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front Nine Selection */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전반 9홀 코스
              </label>
              <select
                value={selectedFrontCourseId || ''}
                onChange={handleFrontCourseChange}
                disabled={coursesLoading || !selectedCompanyId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">
                  {coursesLoading ? '로딩 중...' : '전반 코스 선택'}
                </option>
                {Array.isArray(courses) && courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                    {course.totalPar && ` (Par ${course.totalPar})`}
                  </option>
                ))}
              </select>
              {selectedFrontCourseId && Array.isArray(courses) && (
                <div className="mt-2 text-xs text-gray-600">
                  {courses.find(c => c.id === selectedFrontCourseId)?.description}
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </div>

            {/* Back Nine Selection */}
            <div className="bg-green-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                후반 9홀 코스
              </label>
              <select
                value={selectedBackCourseId || ''}
                onChange={handleBackCourseChange}
                disabled={coursesLoading || !selectedCompanyId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="">
                  {coursesLoading ? '로딩 중...' : '후반 코스 선택'}
                </option>
                {Array.isArray(courses) && courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                    {course.totalPar && ` (Par ${course.totalPar})`}
                  </option>
                ))}
              </select>
              {selectedBackCourseId && Array.isArray(courses) && (
                <div className="mt-2 text-xs text-gray-600">
                  {courses.find(c => c.id === selectedBackCourseId)?.description}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {isSelectionComplete && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700">선택된 18홀 라운딩 코스</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">전반:</span>
                {Array.isArray(courses) && courses.find(c => c.id === selectedFrontCourseId)?.name}
                <ChevronRight className="w-4 h-4" />
                <span className="font-medium">후반:</span>
                {Array.isArray(courses) && courses.find(c => c.id === selectedBackCourseId)?.name}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                총 Par: {
                  Array.isArray(courses) ? (
                    (courses.find(c => c.id === selectedFrontCourseId)?.totalPar || 0) +
                    (courses.find(c => c.id === selectedBackCourseId)?.totalPar || 0)
                  ) : 0
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};