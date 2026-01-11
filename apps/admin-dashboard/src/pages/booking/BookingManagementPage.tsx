import React from 'react';
import { BookingList } from '@/components/features/booking';

export const BookingManagementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예약 현황</h1>
          <p className="text-gray-500 mt-1">실시간 예약 조회 및 관리</p>
        </div>
      </div>

      {/* 예약 목록 */}
      <BookingList />
    </div>
  );
};

export default BookingManagementPage;
