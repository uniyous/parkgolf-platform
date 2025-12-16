import React, { useState, useEffect } from 'react';
import { EnhancedAdminList } from './EnhancedAdminList';
import { EnhancedAdminForm } from './EnhancedAdminForm';
import { EnhancedRoleManagement } from './EnhancedRoleManagement';
import { AdminBulkActions } from './AdminBulkActions';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useConfirmation } from '../../hooks/useConfirmation';
import type { Admin } from '../../types';

type ViewMode = 'list' | 'create' | 'edit' | 'permissions';

export const EnhancedAdminManagementContainer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [permissionAdmin, setPermissionAdmin] = useState<Admin | null>(null);
  const [selectedAdmins, setSelectedAdmins] = useState<Admin[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { deleteAdmin, fetchAdmins } = useAdminActions();
  const { showConfirmation } = useConfirmation();

  // 데이터 새로고침
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchAdmins();
  };

  // 관리자 선택 핸들러
  const handleSelectAdmin = (admin: Admin) => {
    // 단일 선택 시 상세 정보 표시나 기타 작업
    console.log('Selected admin:', admin);
  };

  // 관리자 생성 시작
  const handleCreateAdmin = () => {
    setEditingAdmin(null);
    setViewMode('create');
  };

  // 관리자 수정 시작
  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setViewMode('edit');
  };

  // 권한 관리 시작
  const handleManagePermissions = (admin: Admin) => {
    setPermissionAdmin(admin);
    setViewMode('permissions');
  };

  // 관리자 삭제 확인
  const handleDeleteAdmin = async (admin: Admin) => {
    const confirmed = await showConfirmation({
      title: '관리자 삭제',
      message: `${admin.name}(${admin.username}) 관리자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      cancelText: '취소',
      type: 'danger',
    });

    if (confirmed) {
      const success = await deleteAdmin(admin.id);
      if (success) {
        // 삭제된 관리자가 선택된 목록에 있다면 제거
        setSelectedAdmins(prev => prev.filter(a => a.id !== admin.id));
        handleRefresh();
      }
    }
  };

  // 선택 변경 핸들러
  const handleSelectionChange = (admins: Admin[]) => {
    setSelectedAdmins(admins);
  };

  // 일괄 작업 표시
  const handleShowBulkActions = () => {
    if (selectedAdmins.length > 0) {
      setShowBulkActions(true);
    }
  };

  // 일괄 작업 완료
  const handleBulkActionSuccess = () => {
    setSelectedAdmins([]);
    setShowBulkActions(false);
    handleRefresh();
  };

  // 폼 성공 핸들러
  const handleFormSuccess = () => {
    setViewMode('list');
    setEditingAdmin(null);
    handleRefresh();
  };

  // 폼 취소 핸들러
  const handleFormCancel = () => {
    setViewMode('list');
    setEditingAdmin(null);
  };

  // 권한 관리 완료 핸들러
  const handlePermissionUpdate = (updatedAdmin: Admin) => {
    setViewMode('list');
    setPermissionAdmin(null);
    handleRefresh();
  };

  // 권한 관리 취소 핸들러
  const handlePermissionCancel = () => {
    setViewMode('list');
    setPermissionAdmin(null);
  };

  // 뒤로가기 핸들러
  const handleBack = () => {
    setViewMode('list');
    setEditingAdmin(null);
    setPermissionAdmin(null);
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: 전체 선택
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && viewMode === 'list') {
        e.preventDefault();
        // 전체 선택 로직은 EnhancedAdminList에서 처리
      }
      
      // Ctrl/Cmd + N: 새 관리자 추가
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && viewMode === 'list') {
        e.preventDefault();
        handleCreateAdmin();
      }
      
      // Ctrl/Cmd + B: 일괄 작업 (선택된 항목이 있을 때)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && selectedAdmins.length > 0) {
        e.preventDefault();
        handleShowBulkActions();
      }
      
      // ESC: 뒤로가기
      if (e.key === 'Escape' && viewMode !== 'list') {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, selectedAdmins.length]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      {viewMode !== 'list' && (
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {viewMode === 'create' && '새 관리자 추가'}
                {viewMode === 'edit' && '관리자 정보 수정'}
                {viewMode === 'permissions' && '권한 관리'}
              </h1>
              {viewMode === 'edit' && editingAdmin && (
                <span className="text-sm text-gray-500">
                  - {editingAdmin.name}
                </span>
              )}
              {viewMode === 'permissions' && permissionAdmin && (
                <span className="text-sm text-gray-500">
                  - {permissionAdmin.name}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 일괄 작업 바 */}
      {viewMode === 'list' && selectedAdmins.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {selectedAdmins.length}
                  </span>
                </div>
                <span className="text-sm font-medium text-blue-900">
                  {selectedAdmins.length}명의 관리자가 선택되었습니다
                </span>
              </div>
              <div className="text-sm text-blue-700">
                선택된 관리자들에 대해 일괄 작업을 수행할 수 있습니다
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShowBulkActions}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                일괄 작업
              </button>
              <button
                onClick={() => setSelectedAdmins([])}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div>
        {viewMode === 'list' && (
          <EnhancedAdminList
            key={refreshKey}
            onSelectAdmin={handleSelectAdmin}
            onCreateAdmin={handleCreateAdmin}
            onEditAdmin={handleEditAdmin}
            onDeleteAdmin={handleDeleteAdmin}
            onManagePermissions={handleManagePermissions}
            selectedAdmins={selectedAdmins}
            onSelectionChange={handleSelectionChange}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <EnhancedAdminForm
            admin={editingAdmin}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        {viewMode === 'permissions' && permissionAdmin && (
          <EnhancedRoleManagement
            admin={permissionAdmin}
            onUpdate={handlePermissionUpdate}
            onClose={handlePermissionCancel}
          />
        )}
      </div>

      {/* 일괄 작업 모달 */}
      {showBulkActions && (
        <AdminBulkActions
          selectedAdmins={selectedAdmins}
          onSuccess={handleBulkActionSuccess}
          onClose={() => setShowBulkActions(false)}
        />
      )}

      {/* 키보드 단축키 도움말 */}
      {viewMode === 'list' && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-xs text-gray-600 max-w-xs">
          <div className="font-medium mb-2">키보드 단축키</div>
          <div className="space-y-1">
            <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+N</kbd> 새 관리자 추가</div>
            <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+A</kbd> 전체 선택</div>
            {selectedAdmins.length > 0 && (
              <div><kbd className="bg-gray-100 px-1 rounded">Ctrl+B</kbd> 일괄 작업</div>
            )}
            <div><kbd className="bg-gray-100 px-1 rounded">ESC</kbd> 뒤로가기</div>
          </div>
        </div>
      )}
    </div>
  );
};