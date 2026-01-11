import React from 'react';
import { Search, X } from 'lucide-react';

interface Club {
  id: number;
  name: string;
}

interface BookingFiltersProps {
  dateFrom: string;
  dateTo: string;
  clubFilter: number | null;
  searchKeyword: string;
  clubs: Club[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClubFilterChange: (value: number | null) => void;
  onSearchKeywordChange: (value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export const BookingFilters: React.FC<BookingFiltersProps> = ({
  dateFrom,
  dateTo,
  clubFilter,
  searchKeyword,
  clubs,
  onDateFromChange,
  onDateToChange,
  onClubFilterChange,
  onSearchKeywordChange,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 날짜 범위 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">기간</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 골프장 필터 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">골프장</label>
          <select
            value={clubFilter || ''}
            onChange={(e) => onClubFilterChange(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">전체</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        {/* 검색 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="예약자명, 연락처, 예약번호 검색..."
              value={searchKeyword}
              onChange={(e) => onSearchKeywordChange(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {searchKeyword && (
              <button
                onClick={() => onSearchKeywordChange('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 필터 초기화 */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
};
