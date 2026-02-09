import React, { useState, useEffect, useMemo } from 'react';
import { useRolesWithPermissionsQuery, useUpdateAdminMutation } from '@/hooks/queries';
import { Modal, Button } from '@/components/ui';
import type { Admin, AdminRole } from '@/types';
import type { RoleWithPermissions, PermissionDetail } from '@/lib/api/adminApi';
import { ADMIN_ROLE_LABELS } from '@/utils';

interface RoleManagementModalProps {
  open: boolean;
  admin?: Admin;
  onClose: () => void;
}

// 역할 메타데이터
const roleMeta: Record<string, { label: string; description: string; scope: string; color: string; bgColor: string; icon: string }> = {
  // 플랫폼 역할
  PLATFORM_ADMIN: { label: '플랫폼 관리자', description: '플랫폼 전체 시스템의 모든 기능에 접근할 수 있는 최고 권한', scope: '플랫폼', color: 'text-red-800', bgColor: 'bg-red-500/20 border-red-200', icon: '👑' },
  PLATFORM_SUPPORT: { label: '플랫폼 고객지원', description: '플랫폼 전체 데이터 조회 및 고객 지원 권한', scope: '플랫폼', color: 'text-purple-800', bgColor: 'bg-purple-500/20 border-purple-200', icon: '🎧' },
  PLATFORM_VIEWER: { label: '플랫폼 조회', description: '플랫폼 전체 데이터 조회 권한 (읽기 전용)', scope: '플랫폼', color: 'text-white', bgColor: 'bg-white/10 border-white/15', icon: '👁️' },
  // 회사 역할
  COMPANY_ADMIN: { label: '회사 대표', description: '소속 회사 내 전체 권한 (대표/총괄)', scope: '회사', color: 'text-emerald-300', bgColor: 'bg-emerald-500/20 border-emerald-500/30', icon: '🏢' },
  COMPANY_MANAGER: { label: '회사 매니저', description: '소속 회사 운영 관리 권한', scope: '회사', color: 'text-cyan-800', bgColor: 'bg-cyan-100 border-cyan-200', icon: '👨‍💼' },
  COMPANY_STAFF: { label: '회사 직원', description: '소속 회사 현장 업무 권한', scope: '회사', color: 'text-green-800', bgColor: 'bg-green-500/20 border-green-200', icon: '👤' },
  COMPANY_VIEWER: { label: '회사 조회', description: '소속 회사 데이터 조회 권한 (읽기 전용)', scope: '회사', color: 'text-slate-800', bgColor: 'bg-slate-100 border-slate-200', icon: '📖' },
};

// 권한 메타데이터
const permissionMeta: Record<string, { name: string; icon: string }> = {
  COMPANIES: { name: '회사 관리', icon: '🏢' },
  COURSES: { name: '코스 관리', icon: '🏌️' },
  TIMESLOTS: { name: '타임슬롯 관리', icon: '⏰' },
  BOOKINGS: { name: '예약 관리', icon: '📅' },
  USERS: { name: '사용자 관리', icon: '👥' },
  ADMINS: { name: '관리자 관리', icon: '👨‍💼' },
  ANALYTICS: { name: '분석/리포트', icon: '📊' },
  SUPPORT: { name: '고객 지원', icon: '🎧' },
  VIEW: { name: '조회', icon: '👁️' },
  ALL: { name: '전체 권한', icon: '✨' },
};

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({ open, admin, onClose }) => {
  const { data: rolesData, isLoading: rolesLoading } = useRolesWithPermissionsQuery('ADMIN');
  const updateAdmin = useUpdateAdminMutation();

  const [selectedRole, setSelectedRole] = useState<AdminRole | ''>('');
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // 현재 관리자의 역할 가져오기
  const currentRole = admin?.primaryRole || admin?.role || '';

  useEffect(() => {
    if (admin && open) {
      setSelectedRole(currentRole as AdminRole);
      setExpandedRole(null);
    }
  }, [admin, open, currentRole]);

  // 플랫폼 역할과 회사 역할 분리
  const platformRoles = useMemo(() =>
    (rolesData || []).filter((r: RoleWithPermissions) => r.code.startsWith('PLATFORM_')),
    [rolesData]
  );

  const companyRoles = useMemo(() =>
    (rolesData || []).filter((r: RoleWithPermissions) => r.code.startsWith('COMPANY_')),
    [rolesData]
  );

  const handleSave = async () => {
    if (!admin || !selectedRole) return;

    try {
      await updateAdmin.mutateAsync({
        id: admin.id,
        data: { roleCode: selectedRole as AdminRole },
      });
      onClose();
    } catch (error) {
      console.error('Role update failed:', error);
    }
  };

  const getRoleMeta = (roleCode: string) =>
    roleMeta[roleCode] || { label: roleCode, description: '', scope: '', color: 'text-white', bgColor: 'bg-white/10 border-white/15', icon: '🔐' };

  const getPermissionName = (code: string) => permissionMeta[code]?.name || code;
  const getPermissionIcon = (code: string) => permissionMeta[code]?.icon || '📌';

  // 역할의 권한 목록 가져오기
  const getRolePermissions = (role: RoleWithPermissions): string[] => {
    if (!role.permissions) return [];
    return role.permissions.map((p: PermissionDetail | string) =>
      typeof p === 'string' ? p : p.code
    );
  };

  if (!admin) return null;

  // 역할 카드 컴포넌트
  const RoleCard = ({ role }: { role: RoleWithPermissions }) => {
    const meta = getRoleMeta(role.code);
    const isSelected = selectedRole === role.code;
    const isCurrent = currentRole === role.code;
    const isExpanded = expandedRole === role.code;
    const permissions = getRolePermissions(role);
    const hasAllPermission = permissions.includes('ALL');

    return (
      <div
        className={`relative rounded-lg border-2 transition-all ${
          isSelected
            ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
            : `border-white/15 hover:border-white/15 bg-white/10`
        }`}
      >
        {/* 메인 영역 (클릭하면 선택) */}
        <label className="flex items-start p-4 cursor-pointer">
          <input
            type="radio"
            name="role"
            value={role.code}
            checked={isSelected}
            onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
            className="mt-1 h-4 w-4 text-emerald-400 focus:ring-emerald-500"
          />
          <div className="ml-3 flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{meta.icon}</span>
              <span className={`font-semibold ${isSelected ? 'text-emerald-400' : meta.color}`}>
                {meta.label}
              </span>
              {isCurrent && (
                <span className="px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">
                  현재
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/60">{meta.description}</p>

            {/* 권한 요약 */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {hasAllPermission ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs bg-green-500/20 text-green-700 rounded">
                    ✨ 전체 권한
                  </span>
                ) : (
                  <>
                    {permissions.slice(0, 3).map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded"
                      >
                        {getPermissionIcon(code)} {getPermissionName(code)}
                      </span>
                    ))}
                    {permissions.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded">
                        +{permissions.length - 3}개
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpandedRole(isExpanded ? null : role.code);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline"
              >
                {isExpanded ? '접기' : '상세 보기'}
              </button>
            </div>
          </div>
        </label>

        {/* 확장된 권한 목록 */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-white/10">
            <div className="text-xs font-medium text-white/50 mb-2">포함된 권한:</div>
            <div className="grid grid-cols-2 gap-2">
              {hasAllPermission ? (
                <div className="col-span-2 flex items-center space-x-2 p-2 bg-green-500/10 rounded">
                  <span className="text-lg">✨</span>
                  <div>
                    <div className="text-sm font-medium text-green-800">전체 권한</div>
                    <div className="text-xs text-green-600">모든 시스템 기능에 접근 가능</div>
                  </div>
                </div>
              ) : (
                permissions.map((code) => (
                  <div key={code} className="flex items-center space-x-2 p-2 bg-white/5 rounded">
                    <span className="text-sm">{getPermissionIcon(code)}</span>
                    <span className="text-sm text-white/70">{getPermissionName(code)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="역할 변경"
      maxWidth="2xl"
    >
      {/* 관리자 정보 */}
      <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg -mt-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
          {admin.name?.charAt(0) || 'A'}
        </div>
        <div>
          <div className="font-medium text-white">{admin.name}</div>
          <div className="text-sm text-white/50">{admin.email}</div>
        </div>
        <div className="ml-auto">
          <span className={`inline-flex items-center px-3 py-1 text-sm rounded-full ${getRoleMeta(currentRole).bgColor} ${getRoleMeta(currentRole).color}`}>
            {getRoleMeta(currentRole).icon} {ADMIN_ROLE_LABELS[currentRole as AdminRole] || currentRole}
          </span>
        </div>
      </div>

      {rolesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {/* 플랫폼 역할 */}
          {platformRoles.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">🌐</span>
                <h3 className="text-sm font-semibold text-white/70">플랫폼 역할</h3>
                <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-700 rounded">본사/협회</span>
              </div>
              <div className="space-y-3">
                {platformRoles.map((role: RoleWithPermissions) => (
                  <RoleCard key={role.code} role={role} />
                ))}
              </div>
            </div>
          )}

          {/* 회사 역할 */}
          {companyRoles.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">🏢</span>
                <h3 className="text-sm font-semibold text-white/70">회사 역할</h3>
                <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded">가맹점</span>
              </div>
              <div className="space-y-3">
                {companyRoles.map((role: RoleWithPermissions) => (
                  <RoleCard key={role.code} role={role} />
                ))}
              </div>
            </div>
          )}

          {platformRoles.length === 0 && companyRoles.length === 0 && (
            <div className="text-center py-8 text-white/50">
              사용 가능한 역할이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 변경 사항 안내 */}
      {selectedRole && selectedRole !== currentRole && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="text-sm font-medium text-yellow-800">역할 변경 안내</div>
              <p className="text-sm text-yellow-700 mt-1">
                <strong>{admin.name}</strong>님의 역할이{' '}
                <span className="font-semibold">{ADMIN_ROLE_LABELS[currentRole as AdminRole] || currentRole}</span>
                에서{' '}
                <span className="font-semibold">{ADMIN_ROLE_LABELS[selectedRole] || selectedRole}</span>
                (으)로 변경됩니다. 권한이 즉시 적용됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-6 mt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          onClick={handleSave}
          disabled={!selectedRole || selectedRole === currentRole}
          loading={updateAdmin.isPending}
        >
          역할 변경
        </Button>
      </div>
    </Modal>
  );
};
