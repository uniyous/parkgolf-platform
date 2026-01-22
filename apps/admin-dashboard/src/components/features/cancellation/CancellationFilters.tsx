import React from 'react';
import {
  FilterContainer,
  FilterSearch,
  FilterSelect,
  FilterDate,
  FilterResetButton,
} from '@/components/common/filters';

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
  const clubOptions = clubs.map((club) => ({
    value: club.id,
    label: club.name,
  }));

  return (
    <FilterContainer columns={6}>
      {/* 시작 날짜 */}
      <FilterDate
        label="취소일 (시작)"
        value={dateFrom}
        onChange={onDateFromChange}
      />

      {/* 종료 날짜 */}
      <FilterDate
        label="취소일 (종료)"
        value={dateTo}
        onChange={onDateToChange}
        min={dateFrom}
      />

      {/* 골프장 필터 */}
      <FilterSelect
        label="골프장"
        value={clubFilter}
        onChange={(value) => onClubFilterChange(value ? Number(value) : null)}
        options={clubOptions}
        placeholder="전체 골프장"
      />

      {/* 취소 유형 */}
      <FilterSelect
        label="취소 유형"
        value={cancellationType}
        onChange={onCancellationTypeChange}
        options={CANCELLATION_TYPES}
        placeholder="전체 유형"
      />

      {/* 검색 */}
      <FilterSearch
        value={searchKeyword}
        onChange={onSearchKeywordChange}
        placeholder="예약번호, 이름, 연락처"
        label="검색"
        showLabel
      />

      {/* 초기화 버튼 */}
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
