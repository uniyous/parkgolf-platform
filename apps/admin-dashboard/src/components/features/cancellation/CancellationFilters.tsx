import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface CancellationFiltersProps {
  dateFrom: string;
  dateTo: string;
  clubFilter: number | null;
  cancellationType: string;
  searchKeyword: string;
  clubs: { id: number; name: string }[];
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onClubFilterChange: (clubId: number | null) => void;
  onCancellationTypeChange: (type: string) => void;
  onSearchKeywordChange: (keyword: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const CANCELLATION_TYPES = [
  { value: '', label: '전체 유형' },
  { value: 'USER_NORMAL', label: '고객 정상 취소' },
  { value: 'USER_LATE', label: '고객 지연 취소' },
  { value: 'USER_LASTMINUTE', label: '고객 긴급 취소' },
  { value: 'ADMIN', label: '관리자 취소' },
  { value: 'SYSTEM', label: '시스템 취소' },
];

export const CancellationFilters: React.FC<CancellationFiltersProps> = ({
  dateFrom,
  dateTo,
  clubFilter,
  cancellationType,
  searchKeyword,
  clubs,
  onDateFromChange,
  onDateToChange,
  onClubFilterChange,
  onCancellationTypeChange,
  onSearchKeywordChange,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* 시작 날짜 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">취소일 (시작)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 종료 날짜 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">취소일 (종료)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 골프장 필터 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">골프장</label>
          <select
            value={clubFilter || ''}
            onChange={(e) => onClubFilterChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">전체 골프장</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        {/* 취소 유형 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">취소 유형</label>
          <select
            value={cancellationType}
            onChange={(e) => onCancellationTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {CANCELLATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* 검색 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">검색</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="예약번호, 이름, 연락처"
              value={searchKeyword}
              onChange={(e) => onSearchKeywordChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 초기화 버튼 */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            disabled={!hasActiveFilters}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              hasActiveFilters
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            필터 초기화
          </button>
        </div>
      </div>
    </div>
  );
};
