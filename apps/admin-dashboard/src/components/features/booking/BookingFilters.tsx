import React from 'react';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterDateRange,
  FilterResetButton,
} from '@/components/common/filters';

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
  const clubOptions = clubs.map((club) => ({
    value: club.id,
    label: club.name,
  }));

  return (
    <FilterContainer columns={5}>
      {/* 날짜 범위 */}
      <FilterDateRange
        startDate={dateFrom}
        endDate={dateTo}
        onStartDateChange={onDateFromChange}
        onEndDateChange={onDateToChange}
        label="기간"
        className="lg:col-span-2"
      />

      {/* 골프장 필터 */}
      <FilterSelect
        label="골프장"
        value={clubFilter}
        onChange={(value) => onClubFilterChange(value ? Number(value) : null)}
        options={clubOptions}
        placeholder="전체"
      />

      {/* 검색 */}
      <FilterSearch
        value={searchKeyword}
        onChange={onSearchKeywordChange}
        placeholder="예약자명, 연락처, 예약번호 검색..."
        label="검색"
        showLabel
      />

      {/* 필터 초기화 */}
      <div className="flex items-end">
        <FilterResetButton
          hasActiveFilters={hasActiveFilters}
          onClick={onReset}
          label="필터 초기화"
          className="w-full"
        />
      </div>
    </FilterContainer>
  );
};
