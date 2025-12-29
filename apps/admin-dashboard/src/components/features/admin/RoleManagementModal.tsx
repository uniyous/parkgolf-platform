import React, { useState, useEffect } from 'react';
import { useRolesWithPermissionsQuery, useUpdateAdminMutation } from '@/hooks/queries';
import { Modal } from '@/components/ui';
import type { Admin, AdminRole } from '@/types';
import { ADMIN_ROLE_LABELS } from '@/utils';

interface RoleManagementModalProps {
  open: boolean;
  admin?: Admin;
  onClose: () => void;
}

interface RoleWithPermissions {
  code: string;
  name: string;
  description?: string;
  permissions?: Array<{ code: string; name: string }>;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({ open, admin, onClose }) => {
  const { data: rolesData, isLoading: rolesLoading } = useRolesWithPermissionsQuery('ADMIN');
  const updateAdmin = useUpdateAdminMutation();

  const [selectedRole, setSelectedRole] = useState<AdminRole | ''>('');

  useEffect(() => {
    if (admin) {
      setSelectedRole(admin.role);
    }
  }, [admin, open]);

  const handleSave = async () => {
    if (!admin || !selectedRole) return;

    try {
      await updateAdmin.mutateAsync({
        id: admin.id,
        data: { role: selectedRole as AdminRole },
      });
      onClose();
    } catch (error) {
      console.error('Role update failed:', error);
    }
  };

  if (!admin) return null;

  const roles: RoleWithPermissions[] = rolesData || [];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="역할 및 권한 관리"
      maxWidth="2xl"
    >
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        {admin.name} ({admin.email})
      </p>

      <div>
          {rolesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Role */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">현재 역할</h3>
                <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                  {ADMIN_ROLE_LABELS[admin.role] || admin.role}
                </span>
              </div>

              {/* Role Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">역할 변경</h3>
                <div className="grid grid-cols-1 gap-3">
                  {roles.map((role) => (
                    <label
                      key={role.code}
                      className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRole === role.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role.code}
                        checked={selectedRole === role.code}
                        onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {role.name}
                        </div>
                        {role.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {role.description}
                          </div>
                        )}
                        {role.permissions && role.permissions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {role.permissions.slice(0, 5).map((perm) => (
                              <span
                                key={perm.code}
                                className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                              >
                                {perm.name}
                              </span>
                            ))}
                            {role.permissions.length > 5 && (
                              <span className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{role.permissions.length - 5}개 더
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}

                  {roles.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      사용 가능한 역할이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={updateAdmin.isPending || !selectedRole || selectedRole === admin.role}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateAdmin.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
