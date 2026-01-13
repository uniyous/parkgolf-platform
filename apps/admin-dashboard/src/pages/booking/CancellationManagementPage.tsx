import React from 'react';
import { CancellationList } from '@/components/features/cancellation';

export const CancellationManagementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">취소/환불 관리</h1>
            <p className="text-gray-500 mt-1">예약 취소 및 환불 처리</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">환불 대기</span>
            <span>→</span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">환불 완료</span>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">
            💰
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">환불 처리 안내</h3>
            <p className="text-sm text-gray-600 mt-1">
              취소된 예약 건에 대해 환불 상태를 확인하고 환불 처리를 진행할 수 있습니다.
              환불 금액은 취소 정책에 따라 자동 계산되며, 관리자가 필요 시 금액을 조정할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 취소/환불 목록 */}
      <CancellationList />
    </div>
  );
};

export default CancellationManagementPage;
