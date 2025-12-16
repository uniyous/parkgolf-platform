import React, { useState } from 'react';
import { AdminList } from './AdminList';
import { AdminForm } from './AdminForm';
import { RoleManagement } from './RoleManagement';
import { useAdminActions } from '../../hooks/useAdminActions';
import type { Admin } from '../../types';

type ViewMode = 'list' | 'create' | 'edit' | 'permissions';

export const AdminManagementContainer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [permissionAdmin, setPermissionAdmin] = useState<Admin | null>(null);
  
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const { selectAdmin, deleteAdmin } = useAdminActions();

  // 관리자 선택 핸들러
  const handleSelectAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    selectAdmin(admin.id);
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
    const confirmed = window.confirm(`${admin.name}(${admin.username}) 관리자를 삭제하시겠습니까?`);

    if (confirmed) {
      const success = await deleteAdmin(admin.id);
      if (success) {
        // 삭제된 관리자가 현재 선택된 관리자라면 선택 해제
        if (selectedAdmin?.id === admin.id) {
          setSelectedAdmin(null);
          selectAdmin(null);
        }
        
        // 목록 뷰로 돌아가기
        setViewMode('list');
      }
    }
  };

  // 폼 성공 핸들러
  const handleFormSuccess = (admin: Admin) => {
    setViewMode('list');
    setEditingAdmin(null);
    setSelectedAdmin(admin);
    selectAdmin(admin.id); // 생성/수정된 관리자 선택
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
    setSelectedAdmin(updatedAdmin);
    selectAdmin(updatedAdmin.id); // 업데이트된 관리자 선택
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

  return (
    <div className="space-y-6">
      {/* 헤더 및 네비게이션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {viewMode !== 'list' && (
            <button
              onClick={handleBack}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
          )}
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {viewMode === 'list' && '관리자 관리'}
              {viewMode === 'create' && '새 관리자 추가'}
              {viewMode === 'edit' && '관리자 정보 수정'}
              {viewMode === 'permissions' && '권한 관리'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === 'list' && '시스템 관리자들을 관리합니다.'}
              {viewMode === 'create' && '새로운 관리자를 추가합니다.'}
              {viewMode === 'edit' && '관리자 정보를 수정합니다.'}
              {viewMode === 'permissions' && '관리자의 역할과 권한을 설정합니다.'}
            </p>
          </div>
        </div>

        {/* 선택된 관리자 정보 (목록 뷰에서만) */}
        {viewMode === 'list' && selectedAdmin && (
          <div className="bg-blue-50 px-4 py-3 rounded-lg">
            <div className="text-sm font-medium text-blue-900">선택된 관리자</div>
            <div className="text-sm text-blue-700">
              {selectedAdmin.name} ({selectedAdmin.username})
            </div>
            <div className="mt-2 space-x-2">
              <button
                onClick={() => handleEditAdmin(selectedAdmin)}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
              >
                정보 수정
              </button>
              <button
                onClick={() => handleManagePermissions(selectedAdmin)}
                className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
              >
                권한 관리
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 메인 콘텐츠 */}
      <div>
        {viewMode === 'list' && (
          <AdminList
            onSelectAdmin={handleSelectAdmin}
            onCreateAdmin={handleCreateAdmin}
            onEditAdmin={handleEditAdmin}
            onDeleteAdmin={handleDeleteAdmin}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <AdminForm
            admin={editingAdmin}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        {viewMode === 'permissions' && permissionAdmin && (
          <RoleManagement
            admin={permissionAdmin}
            onUpdate={handlePermissionUpdate}
            onClose={handlePermissionCancel}
          />
        )}
      </div>
    </div>
  );
};