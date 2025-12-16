import React, { useState } from 'react';
import type { BulkTimeSlotOperation, TimeSlotStatus } from '../../types/timeslot';

interface TimeSlotBulkActionsProps {
  selectedCount: number;
  onBulkOperation: (operation: BulkTimeSlotOperation) => void;
  onClose: () => void;
}

export const TimeSlotBulkActions: React.FC<TimeSlotBulkActionsProps> = ({
  selectedCount,
  onBulkOperation,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  const handleBulkDelete = async () => {
    if (window.confirm(`선택된 ${selectedCount}개의 타임슬롯을 삭제하시겠습니까?`)) {
      setIsLoading(true);
      await onBulkOperation({ type: 'DELETE' });
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (status: TimeSlotStatus) => {
    setIsLoading(true);
    await onBulkOperation({ 
      type: 'STATUS_CHANGE', 
      data: { status } 
    });
    setIsLoading(false);
    setShowStatusModal(false);
  };

  const handlePriceUpdate = async () => {
    if (!newPrice || isNaN(Number(newPrice))) {
      alert('올바른 가격을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    await onBulkOperation({ 
      type: 'UPDATE', 
      data: { price: Number(newPrice) } 
    });
    setIsLoading(false);
    setShowPriceModal(false);
    setNewPrice('');
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-900">
            {selectedCount}개 타임슬롯 선택됨
          </span>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowStatusModal(true)}
              disabled={isLoading}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              상태 변경
            </button>
            
            <button
              onClick={() => setShowPriceModal(true)}
              disabled={isLoading}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              가격 변경
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
            >
              삭제
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">상태 변경</h3>
            <p className="text-sm text-gray-600 mb-6">
              선택된 {selectedCount}개 타임슬롯의 상태를 변경합니다.
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-left"
              >
                활성으로 변경
              </button>
              <button
                onClick={() => handleStatusChange('INACTIVE')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-left"
              >
                비활성으로 변경
              </button>
              <button
                onClick={() => handleStatusChange('CANCELLED')}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-left"
              >
                취소로 변경
              </button>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Change Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">가격 변경</h3>
            <p className="text-sm text-gray-600 mb-6">
              선택된 {selectedCount}개 타임슬롯의 가격을 변경합니다.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 가격 (원)
              </label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min="0"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50000"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPriceModal(false);
                  setNewPrice('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                취소
              </button>
              <button
                onClick={handlePriceUpdate}
                disabled={!newPrice || isNaN(Number(newPrice))}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};