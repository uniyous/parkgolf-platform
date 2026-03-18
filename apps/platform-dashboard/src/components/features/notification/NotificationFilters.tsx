import React from 'react';

interface NotificationFiltersProps {
  startDate: string;
  endDate: string;
  typeFilter: string;
  statusFilter: string;
  searchKeyword: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (keyword: string) => void;
}

const TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'PUSH', label: '푸시' },
  { value: 'EMAIL', label: '이메일' },
  { value: 'SMS', label: 'SMS' },
  { value: 'IN_APP', label: '인앱' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'PENDING', label: '대기' },
  { value: 'SENT', label: '발송' },
  { value: 'DELIVERED', label: '전달' },
  { value: 'FAILED', label: '실패' },
  { value: 'READ', label: '읽음' },
];

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  startDate,
  endDate,
  typeFilter,
  statusFilter,
  searchKeyword,
  onStartDateChange,
  onEndDateChange,
  onTypeChange,
  onStatusChange,
  onSearchChange,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-4">
      <div className="flex flex-wrap items-center gap-4">
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

        <select
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="제목, 내용 검색..."
            className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
