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
  paymentMethodFilter: string;
  searchKeyword: string;
  clubs: Club[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onClubFilterChange: (value: number | null) => void;
  onPaymentMethodFilterChange: (value: string) => void;
  onSearchKeywordChange: (value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'onsite', label: '현장결제' },
  { value: 'card', label: '카드결제' },
  { value: 'dutchpay', label: '더치페이' },
];

export const BookingFilters: React.FC<BookingFiltersProps> = ({
  dateFrom,
  dateTo,
  clubFilter,
  paymentMethodFilter,
  searchKeyword,
  clubs,
  onDateFromChange,
  onDateToChange,
  onClubFilterChange,
  onPaymentMethodFilterChange,
  onSearchKeywordChange,
  onReset,
  hasActiveFilters,
}) => {
  const clubOptions = clubs.map((club) => ({
    value: club.id,
    label: club.name,
  }));

  return (
    <FilterContainer columns="flex">
      <div className="flex items-end justify-between w-full">
        <div className="flex items-end gap-4">
          {/* 날짜 범위 */}
          <FilterDateRange
            startDate={dateFrom}
            endDate={dateTo}
            onStartDateChange={onDateFromChange}
            onEndDateChange={onDateToChange}
            label="기간"
          />

          {/* 골프장 필터 */}
          <FilterSelect
            label="골프장"
            value={clubFilter}
            onChange={(value) => onClubFilterChange(value ? Number(value) : null)}
            options={clubOptions}
            placeholder="전체"
          />

          {/* 결제수단 필터 */}
          <FilterSelect
            label="결제수단"
            value={paymentMethodFilter || null}
            onChange={(value) => onPaymentMethodFilterChange(value ? String(value) : '')}
            options={PAYMENT_METHOD_OPTIONS}
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
        </div>

        {/* 필터 초기화 */}
        <div className="flex items-end">
          <FilterResetButton
            hasActiveFilters={hasActiveFilters}
            onClick={onReset}
            label="필터 초기화"
          />
        </div>
      </div>
    </FilterContainer>
  );
};
