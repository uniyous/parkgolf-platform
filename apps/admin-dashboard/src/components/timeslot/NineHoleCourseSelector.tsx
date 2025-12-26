import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Company {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  companyId: number;
}

interface NineHoleCourseSelectorProps {
  companies: Company[];
  courses: Course[];
  selectedCompanyId: number | null;
  selectedFirstCourseId: number | null;
  selectedSecondCourseId: number | null;
  roundType: 'NINE_HOLE' | 'EIGHTEEN_HOLE';
  onCompanySelect: (companyId: number) => void;
  onFirstCourseSelect: (courseId: number) => void;
  onSecondCourseSelect: (courseId: number | null) => void;
  onRoundTypeChange: (roundType: 'NINE_HOLE' | 'EIGHTEEN_HOLE') => void;
  loading?: boolean;
}

export const NineHoleCourseSelector: React.FC<NineHoleCourseSelectorProps> = ({
  companies,
  courses,
  selectedCompanyId,
  selectedFirstCourseId,
  selectedSecondCourseId,
  roundType,
  onCompanySelect,
  onFirstCourseSelect,
  onSecondCourseSelect,
  onRoundTypeChange,
  loading = false,
}) => {
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  const selectedFirstCourse = courses.find(c => c.id === selectedFirstCourseId);
  const selectedSecondCourse = courses.find(c => c.id === selectedSecondCourseId);

  // 디버깅용
  console.log('NineHoleCourseSelector - Props:', {
    companies: companies.length,
    courses: courses.length,
    selectedCompanyId,
    selectedFirstCourseId,
    selectedSecondCourseId,
    loading
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">코스 선택 (9홀 기준)</h3>
        
        {/* Round Type Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onRoundTypeChange('NINE_HOLE')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              roundType === 'NINE_HOLE'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            9홀
          </button>
          <button
            onClick={() => onRoundTypeChange('EIGHTEEN_HOLE')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              roundType === 'EIGHTEEN_HOLE'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            18홀
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Company Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            골프장 회사
          </label>
          <div className="relative">
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => e.target.value && onCompanySelect(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              disabled={loading}
            >
              <option value="">회사 선택</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {selectedCompany && (
            <p className="mt-1 text-xs text-gray-500">
              선택됨: {selectedCompany.name}
            </p>
          )}
        </div>

        {/* First Course (Required) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            첫 번째 코스 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedFirstCourseId || ''}
              onChange={(e) => e.target.value && onFirstCourseSelect(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              disabled={loading || !selectedCompanyId}
            >
              <option value="">첫 번째 코스 선택</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {selectedFirstCourse && (
            <p className="mt-1 text-xs text-gray-500">
              선택됨: {selectedFirstCourse.name}
            </p>
          )}
        </div>

        {/* Second Course (Only for 18-hole) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            두 번째 코스 
            {roundType === 'EIGHTEEN_HOLE' && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <select
              value={selectedSecondCourseId || ''}
              onChange={(e) => onSecondCourseSelect(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              disabled={loading || !selectedCompanyId || roundType === 'NINE_HOLE'}
            >
              <option value="">
                {roundType === 'NINE_HOLE' ? '9홀에서는 불필요' : '두 번째 코스 선택'}
              </option>
              {roundType === 'EIGHTEEN_HOLE' && courses
                .filter(course => course.id !== selectedFirstCourseId)
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {selectedSecondCourse && (
            <p className="mt-1 text-xs text-gray-500">
              선택됨: {selectedSecondCourse.name}
            </p>
          )}
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            선택 요약
          </label>
          <div className="bg-gray-50 rounded-md p-3 text-sm">
            <div className="font-medium text-gray-900">
              {roundType === 'NINE_HOLE' ? '9홀 라운드' : '18홀 라운드'}
            </div>
            {selectedFirstCourse && (
              <div className="text-gray-600 mt-1">
                {selectedFirstCourse.name}
                {selectedSecondCourse && (
                  <span> + {selectedSecondCourse.name}</span>
                )}
              </div>
            )}
            {!selectedFirstCourse && (
              <div className="text-gray-400">코스를 선택해주세요</div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      <div className="mt-4 space-y-2">
        {!selectedCompanyId && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded-md p-2">
            먼저 골프장 회사를 선택해주세요.
          </div>
        )}
        
        {selectedCompanyId && !selectedFirstCourseId && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded-md p-2">
            첫 번째 코스를 선택해주세요.
          </div>
        )}
        
        {roundType === 'EIGHTEEN_HOLE' && selectedFirstCourseId && !selectedSecondCourseId && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded-md p-2">
            18홀 라운드에는 두 번째 코스도 선택해주세요.
          </div>
        )}
        
        {((roundType === 'NINE_HOLE' && selectedFirstCourseId) || 
          (roundType === 'EIGHTEEN_HOLE' && selectedFirstCourseId && selectedSecondCourseId)) && (
          <div className="text-sm text-green-600 bg-green-50 rounded-md p-2">
            ✓ 코스 선택이 완료되었습니다. 아래에서 타임슬롯을 관리할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
};