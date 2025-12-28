import React, { useState, useMemo, useEffect } from 'react';
import { PageLayout } from '@/components/layout';
import { Breadcrumb } from '@/components/common';
import { useAdmins, useAdminStats, usePermissions, useRolesWithPermissions, useUpdateRolePermissions } from '@/hooks/queries/admin';

// 권한 레벨 및 카테고리 정보
const permissionMeta: Record<string, { name: string; description: string; level: 'high' | 'medium' | 'low'; category: string; icon: string }> = {
  COMPANIES: { name: '회사 관리', description: '회사 정보 생성/수정/삭제', level: 'high', category: '관리', icon: '🏢' },
  COURSES: { name: '코스 관리', description: '골프장 및 코스 관리', level: 'medium', category: '관리', icon: '🏌️' },
  TIMESLOTS: { name: '타임슬롯 관리', description: '타임슬롯 생성/수정/삭제', level: 'medium', category: '관리', icon: '⏰' },
  BOOKINGS: { name: '예약 관리', description: '예약 조회/생성/수정/취소', level: 'medium', category: '운영', icon: '📅' },
  USERS: { name: '사용자 관리', description: '사용자 계정 관리', level: 'medium', category: '운영', icon: '👥' },
  ADMINS: { name: '관리자 관리', description: '관리자 계정 관리', level: 'high', category: '운영', icon: '👨‍💼' },
  ANALYTICS: { name: '분석/리포트', description: '통계 및 분석 데이터 조회', level: 'low', category: '지원', icon: '📊' },
  SUPPORT: { name: '고객 지원', description: '고객 문의 및 지원 처리', level: 'low', category: '지원', icon: '🎧' },
  VIEW: { name: '조회', description: '데이터 조회 (읽기 전용)', level: 'low', category: '지원', icon: '👁️' },
};

// 역할 메타 정보
const roleMeta: Record<string, { label: string; description: string; scope: string; color: string }> = {
  ADMIN: { label: '시스템 관리자', description: '시스템의 모든 기능에 접근할 수 있는 최고 권한', scope: '전체 시스템', color: 'bg-red-100 text-red-800 border-red-200' },
  MANAGER: { label: '운영 관리자', description: '회사/코스/예약/사용자/관리자 관리 권한', scope: '운영 범위', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  SUPPORT: { label: '고객 지원', description: '예약/사용자 조회 및 고객 지원 권한', scope: '지원 범위', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  STAFF: { label: '현장 스태프', description: '타임슬롯/예약 관리 및 현장 지원 권한', scope: '현장 범위', color: 'bg-green-100 text-green-800 border-green-200' },
  VIEWER: { label: '조회 전용', description: '데이터 조회만 가능한 읽기 전용 권한', scope: '조회 전용', color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

// 카테고리별 아이콘
const categoryIcons: Record<string, string> = {
  '관리': '🏢',
  '운영': '📅',
  '지원': '🎧',
};

export const RolePermissionPage: React.FC = () => {
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('ADMIN');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);

  // API 호출
  const { data: admins = [] } = useAdmins();
  const { data: stats } = useAdminStats();
  const { data: apiPermissions = [] } = usePermissions();
  const { data: rolesWithPermissions = [] } = useRolesWithPermissions('ADMIN');
  const updateRolePermissions = useUpdateRolePermissions();

  // 현재 선택된 역할 (API 데이터에서)
  const selectedRole = useMemo(() =>
    rolesWithPermissions.find((r: any) => r.code === selectedRoleCode) || rolesWithPermissions[0],
    [selectedRoleCode, rolesWithPermissions]
  );

  // 역할별 사용자 수 계산
  const roleUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rolesWithPermissions.forEach((role: any) => {
      counts[role.code] = 0;
    });
    admins.forEach(admin => {
      if (admin.role && counts[admin.role] !== undefined) {
        counts[admin.role]++;
      }
    });
    return counts;
  }, [admins, rolesWithPermissions]);

  // ALL 권한 제외한 실제 권한 목록
  const adminPermissions = useMemo(() => {
    return apiPermissions.filter((p: any) => p.category === 'ADMIN' && p.code !== 'ALL');
  }, [apiPermissions]);

  // 권한을 카테고리별로 그룹화 (ALL 제외)
  const permissionsByCategory = useMemo(() => {
    const groups: Record<string, any[]> = {};

    adminPermissions.forEach((p: any) => {
      const meta = permissionMeta[p.code];
      const category = meta?.category || '기타';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({
        ...p,
        name: meta?.name || p.code,
        description: meta?.description || p.description || '',
        level: meta?.level || 'low',
        icon: meta?.icon || '📌',
      });
    });

    return groups;
  }, [adminPermissions]);

  // 그룹 초기화
  useEffect(() => {
    if (Object.keys(permissionsByCategory).length > 0 && Object.keys(expandedGroups).length === 0) {
      setExpandedGroups(Object.fromEntries(Object.keys(permissionsByCategory).map(k => [k, true])));
    }
  }, [permissionsByCategory]);

  // 편집 모드 시작시 현재 권한 복사
  useEffect(() => {
    if (isEditing && selectedRole) {
      // ALL 권한이 있으면 모든 권한을 선택된 것으로 표시
      if (selectedRole.permissions?.includes('ALL')) {
        setEditedPermissions(adminPermissions.map((p: any) => p.code));
      } else {
        setEditedPermissions(selectedRole.permissions || []);
      }
    }
  }, [isEditing, selectedRole, adminPermissions]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const hasPermission = (permissionCode: string) => {
    if (isEditing) {
      return editedPermissions.includes(permissionCode);
    }
    if (!selectedRole?.permissions) return false;
    if (selectedRole.permissions.includes('ALL')) return true;
    return selectedRole.permissions.includes(permissionCode);
  };

  const togglePermission = (permissionCode: string) => {
    if (!isEditing) return;
    setEditedPermissions(prev =>
      prev.includes(permissionCode)
        ? prev.filter(p => p !== permissionCode)
        : [...prev, permissionCode]
    );
  };

  const toggleAllInGroup = (permissions: any[]) => {
    if (!isEditing) return;
    const groupCodes = permissions.map(p => p.code);
    const allSelected = groupCodes.every(code => editedPermissions.includes(code));

    if (allSelected) {
      setEditedPermissions(prev => prev.filter(p => !groupCodes.includes(p)));
    } else {
      setEditedPermissions(prev => [...new Set([...prev, ...groupCodes])]);
    }
  };

  const selectAll = () => {
    setEditedPermissions(adminPermissions.map((p: any) => p.code));
  };

  const deselectAll = () => {
    setEditedPermissions([]);
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    try {
      await updateRolePermissions.mutateAsync({
        roleCode: selectedRole.code,
        permissions: editedPermissions,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save permissions:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPermissions([]);
  };

  const hasAllGroupPermissions = (permissions: any[]) => {
    return permissions.every(p => hasPermission(p.code));
  };

  const hasSomeGroupPermissions = (permissions: any[]) => {
    return permissions.some(p => hasPermission(p.code)) && !hasAllGroupPermissions(permissions);
  };

  const getGroupPermissionCount = (permissions: any[]) => {
    return permissions.filter(p => hasPermission(p.code)).length;
  };

  const getLevelBadge = (level: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-green-100 text-green-700',
    };
    const labels = { high: '높음', medium: '중간', low: '낮음' };
    return (
      <span className={`px-1.5 py-0.5 text-xs rounded ${styles[level]}`}>
        {labels[level]}
      </span>
    );
  };

  const getRoleColor = (roleCode: string) => {
    return roleMeta[roleCode]?.color || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleMeta = (roleCode: string) => {
    return roleMeta[roleCode] || { label: roleCode, description: '', scope: '', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <PageLayout>
      <Breadcrumb
        items={[
          { label: '시스템', icon: '⚙️' },
          { label: '역할 및 권한 관리', icon: '🔐' }
        ]}
      />
      <PageLayout.Content>
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">역할 및 권한 관리</h2>
                <p className="mt-1 text-sm text-gray-500">
                  시스템 역할과 각 역할별 권한을 관리합니다
                </p>
              </div>
            </div>

            {/* 통계 */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{rolesWithPermissions.length}</div>
                <div className="text-sm text-blue-600">전체 역할</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{adminPermissions.length}</div>
                <div className="text-sm text-purple-600">전체 권한</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats?.total || admins.length}
                </div>
                <div className="text-sm text-green-600">전체 관리자</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{Object.keys(permissionsByCategory).length}</div>
                <div className="text-sm text-gray-600">권한 그룹</div>
              </div>
            </div>
          </div>

          {/* 역할 선택 탭 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {rolesWithPermissions.map((role: any) => {
                  const meta = getRoleMeta(role.code);
                  return (
                    <button
                      key={role.code}
                      onClick={() => {
                        if (!isEditing) {
                          setSelectedRoleCode(role.code);
                        }
                      }}
                      disabled={isEditing}
                      className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${
                        selectedRoleCode === role.code
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } ${isEditing && selectedRoleCode !== role.code ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-semibold">{meta.label || role.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{roleUserCounts[role.code] || 0}명</div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* 역할 정보 및 편집 버튼 */}
            {selectedRole && (
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getRoleMeta(selectedRole.code).label || selectedRole.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-mono rounded border ${getRoleColor(selectedRole.code)}`}>
                        {selectedRole.code}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        레벨 {selectedRole.level}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {getRoleMeta(selectedRole.code).description || selectedRole.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>범위: <strong>{getRoleMeta(selectedRole.code).scope || selectedRole.userType}</strong></span>
                      <span>권한: <strong>{isEditing ? editedPermissions.length : (selectedRole.permissions?.includes('ALL') ? adminPermissions.length : selectedRole.permissions?.length || 0)}개</strong></span>
                      <span>사용자: <strong>{roleUserCounts[selectedRole.code] || 0}명</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={selectAll}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          전체 선택
                        </button>
                        <button
                          onClick={deselectAll}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          전체 해제
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={updateRolePermissions.isPending}
                          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {updateRolePermissions.isPending ? '저장 중...' : '저장'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        권한 편집
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 권한 목록 */}
            <div className="divide-y divide-gray-200">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category}>
                  {/* 그룹 헤더 */}
                  <div
                    className="w-full flex items-center justify-between px-6 py-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <button
                      onClick={() => toggleGroup(category)}
                      className="flex items-center space-x-3 flex-1"
                    >
                      <span className="text-xl">{categoryIcons[category] || '📌'}</span>
                      <span className="font-medium text-gray-900">{category}</span>
                      <span className="text-sm text-gray-500">
                        ({getGroupPermissionCount(permissions)}/{permissions.length})
                      </span>
                    </button>
                    <div className="flex items-center space-x-3">
                      {isEditing && (
                        <button
                          onClick={() => toggleAllInGroup(permissions)}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
                        >
                          {hasAllGroupPermissions(permissions) ? '전체 해제' : '전체 선택'}
                        </button>
                      )}
                      {hasAllGroupPermissions(permissions) ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          전체 선택됨
                        </span>
                      ) : hasSomeGroupPermissions(permissions) ? (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                          부분 선택
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                          선택 없음
                        </span>
                      )}
                      <button onClick={() => toggleGroup(category)}>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedGroups[category] ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 권한 목록 */}
                  {expandedGroups[category] && (
                    <div className="px-6 pb-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {permissions.map((permission: any) => {
                          const granted = hasPermission(permission.code);
                          return (
                            <div
                              key={permission.code}
                              onClick={() => togglePermission(permission.code)}
                              className={`flex items-start p-3 rounded-lg border transition-all ${
                                granted
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-gray-200'
                              } ${isEditing ? 'cursor-pointer hover:shadow-md' : ''}`}
                            >
                              <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 ${
                                granted
                                  ? 'bg-green-500 border-green-500'
                                  : 'bg-white border-gray-300'
                              } flex items-center justify-center transition-colors`}>
                                {granted && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <div className={`text-sm font-medium ${
                                    granted ? 'text-green-900' : 'text-gray-500'
                                  }`}>
                                    {permission.name}
                                  </div>
                                  {getLevelBadge(permission.level)}
                                </div>
                                <div className={`text-xs mt-1 ${
                                  granted ? 'text-green-700' : 'text-gray-400'
                                }`}>
                                  {permission.description}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 font-mono">
                                  {permission.code}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 역할별 권한 매트릭스 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">역할별 권한 매트릭스</h3>
              <p className="mt-1 text-sm text-gray-500">각 역할에 할당된 권한을 한눈에 확인할 수 있습니다</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                      권한
                    </th>
                    {rolesWithPermissions.map((role: any) => (
                      <th key={role.code} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className={`inline-block px-2 py-1 rounded ${getRoleColor(role.code)}`}>
                          {getRoleMeta(role.code).label || role.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminPermissions.map((permission: any) => {
                    const meta = permissionMeta[permission.code];
                    return (
                      <tr key={permission.code}>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{meta?.icon || '📌'}</span>
                            <span>{meta?.name || permission.code}</span>
                          </div>
                        </td>
                        {rolesWithPermissions.map((role: any) => {
                          const hasP = role.permissions?.includes('ALL') || role.permissions?.includes(permission.code);
                          return (
                            <td key={role.code} className="px-4 py-3 text-center">
                              {hasP ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-400 rounded-full">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="text-center text-sm text-gray-500">
            각 역할의 권한을 편집하려면 역할을 선택한 후 "권한 편집" 버튼을 클릭하세요.
          </div>
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
};
