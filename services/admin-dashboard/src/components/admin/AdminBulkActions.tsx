import React, { useState } from 'react';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useConfirmation } from '../../hooks/useConfirmation';
import type { Admin, AdminRole } from '../../types';

interface AdminBulkActionsProps {
  selectedAdmins: Admin[];
  onSuccess: () => void;
  onClose: () => void;
}

type BulkAction = 'activate' | 'deactivate' | 'changeRole' | 'delete' | 'export';

export const AdminBulkActions: React.FC<AdminBulkActionsProps> = ({
  selectedAdmins,
  onSuccess,
  onClose,
}) => {
  const { updateAdmin, deleteAdmin } = useAdminActions();
  const { showConfirmation } = useConfirmation();
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>('VIEWER');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // 작업 옵션
  const bulkActions = [
    {
      id: 'activate' as BulkAction,
      name: '계정 활성화',
      description: '선택된 관리자들의 계정을 활성화합니다',
      icon: '✅',
      color: 'text-green-600 bg-green-100 hover:bg-green-200',
      dangerous: false,
    },
    {
      id: 'deactivate' as BulkAction,
      name: '계정 비활성화',
      description: '선택된 관리자들의 계정을 비활성화합니다',
      icon: '❌',
      color: 'text-orange-600 bg-orange-100 hover:bg-orange-200',
      dangerous: false,
    },
    {
      id: 'changeRole' as BulkAction,
      name: '역할 변경',
      description: '선택된 관리자들의 역할을 일괄 변경합니다',
      icon: '🔄',
      color: 'text-blue-600 bg-blue-100 hover:bg-blue-200',
      dangerous: false,
    },
    {
      id: 'export' as BulkAction,
      name: '데이터 내보내기',
      description: '선택된 관리자들의 정보를 내보냅니다',
      icon: '📤',
      color: 'text-purple-600 bg-purple-100 hover:bg-purple-200',
      dangerous: false,
    },
    {
      id: 'delete' as BulkAction,
      name: '계정 삭제',
      description: '선택된 관리자들의 계정을 영구 삭제합니다',
      icon: '🗑️',
      color: 'text-red-600 bg-red-100 hover:bg-red-200',
      dangerous: true,
    },
  ];

  // 역할 옵션
  const roleOptions: { value: AdminRole; label: string }[] = [
    { value: 'VIEWER', label: '조회자' },
    { value: 'MODERATOR', label: '운영자' },
    { value: 'ADMIN', label: '관리자' },
    { value: 'SUPER_ADMIN', label: '최고 관리자' },
  ];

  // 선택 가능한 관리자들 필터링
  const getActionableAdmins = (action: BulkAction): Admin[] => {
    switch (action) {
      case 'activate':
        return selectedAdmins.filter(admin => !admin.isActive);
      case 'deactivate':
        return selectedAdmins.filter(admin => admin.isActive);
      case 'delete':
        return selectedAdmins.filter(admin => admin.role !== 'SUPER_ADMIN');
      case 'changeRole':
        return selectedAdmins.filter(admin => admin.role !== newRole);
      default:
        return selectedAdmins;
    }
  };

  // 작업 실행
  const executeAction = async () => {
    if (!selectedAction) return;

    const actionableAdmins = getActionableAdmins(selectedAction);
    if (actionableAdmins.length === 0) {
      alert('선택된 조건에 해당하는 관리자가 없습니다.');
      return;
    }

    // 확인 메시지
    const confirmMessage = getConfirmMessage(selectedAction, actionableAdmins.length);
    const confirmed = await showConfirmation({
      title: '일괄 작업 확인',
      message: confirmMessage,
      confirmText: '실행',
      cancelText: '취소',
      type: bulkActions.find(a => a.id === selectedAction)?.dangerous ? 'danger' : 'warning',
    });

    if (!confirmed) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const total = actionableAdmins.length;
      let completed = 0;

      for (const admin of actionableAdmins) {
        await executeActionForAdmin(selectedAction, admin);
        completed++;
        setProgress(Math.round((completed / total) * 100));
        
        // UI 업데이트를 위한 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('일괄 작업 실행 중 오류:', error);
      alert('일괄 작업 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // 개별 관리자에 대한 작업 실행
  const executeActionForAdmin = async (action: BulkAction, admin: Admin) => {
    switch (action) {
      case 'activate':
        await updateAdmin(admin.id, { isActive: true });
        break;
      case 'deactivate':
        await updateAdmin(admin.id, { isActive: false });
        break;
      case 'changeRole':
        await updateAdmin(admin.id, { role: newRole });
        break;
      case 'delete':
        await deleteAdmin(admin.id);
        break;
      case 'export':
        // 내보내기는 별도 처리
        break;
    }
  };

  // 확인 메시지 생성
  const getConfirmMessage = (action: BulkAction, count: number): string => {
    switch (action) {
      case 'activate':
        return `${count}명의 관리자 계정을 활성화하시겠습니까?`;
      case 'deactivate':
        return `${count}명의 관리자 계정을 비활성화하시겠습니까?\n비활성화된 계정은 로그인할 수 없습니다.`;
      case 'changeRole':
        return `${count}명의 관리자 역할을 "${roleOptions.find(r => r.value === newRole)?.label}"로 변경하시겠습니까?`;
      case 'delete':
        return `${count}명의 관리자 계정을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
      case 'export':
        return `${count}명의 관리자 정보를 내보내시겠습니까?`;
      default:
        return `${count}명의 관리자에 대해 작업을 실행하시겠습니까?`;
    }
  };

  // 데이터 내보내기
  const handleExport = () => {
    const csvData = selectedAdmins.map(admin => ({
      '사용자명': admin.username,
      '이름': admin.name,
      '이메일': admin.email,
      '역할': roleOptions.find(r => r.value === admin.role)?.label || admin.role,
      '상태': admin.isActive ? '활성' : '비활성',
      '생성일': admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('ko-KR') : '',
      '마지막 로그인': admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleDateString('ko-KR') : '없음',
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `관리자_목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    onClose();
  };

  // 실행 버튼 활성화 조건
  const canExecute = selectedAction && (
    selectedAction === 'export' || 
    getActionableAdmins(selectedAction).length > 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto m-4">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                일괄 작업
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedAdmins.length}명의 관리자가 선택되었습니다
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 진행률 표시 (처리 중일 때) */}
        {isProcessing && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">작업 진행 중...</div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-blue-700 mt-1">{progress}% 완료</div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* 선택된 관리자 목록 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">선택된 관리자</h4>
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
              <div className="divide-y divide-gray-200">
                {selectedAdmins.map((admin) => (
                  <div key={admin.id} className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                      <div className="text-xs text-gray-500">@{admin.username}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {roleOptions.find(r => r.value === admin.role)?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 작업 선택 */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">수행할 작업</h4>
            <div className="grid grid-cols-1 gap-3">
              {bulkActions.map((action) => {
                const actionableCount = getActionableAdmins(action.id).length;
                const isDisabled = action.id !== 'export' && actionableCount === 0;
                
                return (
                  <div
                    key={action.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedAction === action.id
                        ? 'border-blue-500 bg-blue-50'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${action.dangerous && selectedAction === action.id ? 'border-red-500 bg-red-50' : ''}`}
                    onClick={() => !isDisabled && !isProcessing && setSelectedAction(action.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        checked={selectedAction === action.id}
                        onChange={() => {}}
                        disabled={isDisabled || isProcessing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{action.icon}</span>
                          <span className="font-medium text-gray-900">{action.name}</span>
                          {action.dangerous && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                              위험
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {action.id === 'export' 
                            ? `${selectedAdmins.length}명의 정보를 내보냅니다`
                            : isDisabled 
                            ? '적용 가능한 관리자가 없습니다' 
                            : `${actionableCount}명에게 적용됩니다`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 역할 변경 옵션 */}
          {selectedAction === 'changeRole' && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">새 역할 선택</h4>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                disabled={isProcessing}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {getActionableAdmins('changeRole').length}명의 역할이 변경됩니다
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={selectedAction === 'export' ? handleExport : executeAction}
            disabled={!canExecute || isProcessing}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedAction && bulkActions.find(a => a.id === selectedAction)?.dangerous
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {isProcessing ? '처리 중...' : '실행'}
          </button>
        </div>
      </div>
    </div>
  );
};