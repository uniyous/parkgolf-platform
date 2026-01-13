import React from 'react';

interface CancellationStatsCardsProps {
  stats: {
    total: number;
    pendingRefund: number;
    completedRefund: number;
    noRefund: number;
    totalRefundAmount: number;
  };
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export const CancellationStatsCards: React.FC<CancellationStatsCardsProps> = ({
  stats,
  selectedFilter,
  onFilterChange,
}) => {
  const cards = [
    {
      key: 'ALL',
      label: '전체 취소',
      value: stats.total,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      activeColor: 'bg-gray-600 text-white',
    },
    {
      key: 'PENDING',
      label: '환불 대기',
      value: stats.pendingRefund,
      color: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      activeColor: 'bg-yellow-500 text-white',
    },
    {
      key: 'COMPLETED',
      label: '환불 완료',
      value: stats.completedRefund,
      color: 'bg-green-50 text-green-800 border-green-200',
      activeColor: 'bg-green-600 text-white',
    },
    {
      key: 'NO_REFUND',
      label: '환불 없음',
      value: stats.noRefund,
      color: 'bg-red-50 text-red-800 border-red-200',
      activeColor: 'bg-red-600 text-white',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => {
        const isActive = selectedFilter === card.key;
        return (
          <button
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            className={`p-4 rounded-lg border transition-all ${
              isActive ? card.activeColor : card.color
            } hover:shadow-md`}
          >
            <div className="text-2xl font-bold">{card.value}</div>
            <div className={`text-sm ${isActive ? 'opacity-90' : 'opacity-70'}`}>
              {card.label}
            </div>
          </button>
        );
      })}

      {/* 총 환불 금액 */}
      <div className="p-4 rounded-lg border bg-blue-50 text-blue-800 border-blue-200">
        <div className="text-2xl font-bold">
          ₩{stats.totalRefundAmount.toLocaleString()}
        </div>
        <div className="text-sm opacity-70">총 환불 금액</div>
      </div>
    </div>
  );
};
