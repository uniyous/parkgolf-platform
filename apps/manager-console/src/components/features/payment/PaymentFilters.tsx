import React from 'react';
import type { PaymentStatus } from '@/types';

interface PaymentFiltersProps {
  startDate: string;
  endDate: string;
  statusFilter: PaymentStatus | '';
  searchKeyword: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onStatusChange: (status: PaymentStatus | '') => void;
  onSearchChange: (keyword: string) => void;
}

const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatus | ''; label: string }> = [
  { value: '', label: '전체 상태' },
  { value: 'DONE', label: '완료' },
  { value: 'CANCELED', label: '취소' },
  { value: 'PARTIAL_CANCELED', label: '부분취소' },
  { value: 'READY', label: '준비' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'WAITING_FOR_DEPOSIT', label: '입금대기' },
  { value: 'EXPIRED', label: '만료' },
];

export const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  startDate,
  endDate,
  statusFilter,
  searchKeyword,
  onStartDateChange,
  onEndDateChange,
  onStatusChange,
  onSearchChange,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* 기간 필터 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-white/60">기간</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-white/40">~</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as PaymentStatus | '')}
          className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800">
              {opt.label}
            </option>
          ))}
        </select>

        {/* 검색 */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="주문번호, 예약번호 검색..."
            className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
