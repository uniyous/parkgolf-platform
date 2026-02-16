import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout';
import { DataContainer } from '@/components/common';
import { useAdminsQuery, usePermissionsQuery, useRolesWithPermissionsQuery } from '@/hooks/queries/admin';
import type { RoleWithPermissions, PermissionInfo, PermissionDetail } from '@/lib/api/adminApi';

// 권한 메타데이터
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
const roleMeta: Record<string, { label: string; description: string; scope: string; color: string; bgColor: string }> = {
  // 플랫폼 역할
  PLATFORM_ADMIN: { label: '플랫폼 관리자', description: '플랫폼 전체 시스템의 모든 기능에 접근할 수 있는 최고 권한', scope: '플랫폼', color: 'text-red-800', bgColor: 'bg-red-500/20 border-red-200' },
  PLATFORM_SUPPORT: { label: '플랫폼 고객지원', description: '플랫폼 전체 데이터 조회 및 고객 지원 권한', scope: '플랫폼', color: 'text-purple-800', bgColor: 'bg-purple-500/20 border-purple-200' },
  PLATFORM_VIEWER: { label: '플랫폼 조회', description: '플랫폼 전체 데이터 조회 권한 (읽기 전용)', scope: '플랫폼', color: 'text-white', bgColor: 'bg-white/10 border-white/15' },
  // 회사 역할
  COMPANY_ADMIN: { label: '회사 대표', description: '소속 회사 내 전체 권한 (대표/총괄)', scope: '회사', color: 'text-emerald-300', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
  COMPANY_MANAGER: { label: '회사 매니저', description: '소속 회사 운영 관리 권한', scope: '회사', color: 'text-cyan-800', bgColor: 'bg-cyan-100 border-cyan-200' },
  COMPANY_STAFF: { label: '회사 직원', description: '소속 회사 현장 업무 권한', scope: '회사', color: 'text-green-800', bgColor: 'bg-green-500/20 border-green-200' },
  COMPANY_VIEWER: { label: '회사 조회', description: '소속 회사 데이터 조회 권한 (읽기 전용)', scope: '회사', color: 'text-slate-800', bgColor: 'bg-slate-100 border-slate-200' },
};

// 역할 아이콘
const roleIcons: Record<string, string> = {
  PLATFORM_ADMIN: '👑',
  PLATFORM_SUPPORT: '🎧',
  PLATFORM_VIEWER: '👁️',
  COMPANY_ADMIN: '🏢',
  COMPANY_MANAGER: '👨‍💼',
  COMPANY_STAFF: '👤',
  COMPANY_VIEWER: '📖',
};

export const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>('');

  // API 호출
  const { data: admins = [] } = useAdminsQuery();
  const { data: apiPermissions = [] } = usePermissionsQuery();
  const { data: rolesWithPermissions = [], isLoading } = useRolesWithPermissionsQuery('ADMIN');

  // 플랫폼 역할과 회사 역할 분리
  const platformRoles = useMemo(() =>
    rolesWithPermissions.filter(r => r.code.startsWith('PLATFORM_')),
    [rolesWithPermissions]
  );

  const companyRoles = useMemo(() =>
    rolesWithPermissions.filter(r => r.code.startsWith('COMPANY_')),
    [rolesWithPermissions]
  );

  // 현재 선택된 역할
  const selectedRole = useMemo((): RoleWithPermissions | undefined =>
    rolesWithPermissions.find(r => r.code === selectedRoleCode),
    [selectedRoleCode, rolesWithPermissions]
  );

  // 역할별 관리자 수 계산
  const roleAdminCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rolesWithPermissions.forEach(role => { counts[role.code] = 0; });
    admins.forEach(admin => {
      const role = admin.primaryRole || admin.role;
      if (role && counts[role] !== undefined) {
        counts[role]++;
      }
    });
    return counts;
  }, [admins, rolesWithPermissions]);

  // ALL 권한 제외한 관리자 권한 목록
  const adminPermissions = useMemo((): PermissionInfo[] =>
    apiPermissions.filter(p => (p as PermissionInfo & { category?: string }).category === 'ADMIN' && p.code !== 'ALL'),
    [apiPermissions]
  );

  // 역할의 권한 확인
  const roleHasPermission = (role: RoleWithPermissions, permissionCode: string): boolean => {
    const permCodes = role.permissions?.map((p: PermissionDetail | string) =>
      typeof p === 'string' ? p : p.code
    ) || [];
    return permCodes.includes('ALL') || permCodes.includes(permissionCode);
  };

  const getRoleMeta = (roleCode: string) =>
    roleMeta[roleCode] || { label: roleCode, description: '', scope: '', color: 'text-white', bgColor: 'bg-white/10 border-white/15' };

  const getLevelBadge = (level: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-red-500/20 text-red-700',
      medium: 'bg-yellow-500/20 text-yellow-700',
      low: 'bg-green-500/20 text-green-700',
    };
    const labels = { high: '높음', medium: '중간', low: '낮음' };
    return (
      <span className={`px-1.5 py-0.5 text-xs rounded ${styles[level]}`}>
        {labels[level]}
      </span>
    );
  };

  // 역할 카드 컴포넌트
  const RoleCard = ({ role }: { role: RoleWithPermissions }) => {
    const meta = getRoleMeta(role.code);
    const adminCount = roleAdminCounts[role.code] || 0;
    const permissionCount = role.permissions?.some((p: PermissionDetail | string) =>
      (typeof p === 'string' ? p : p.code) === 'ALL'
    ) ? adminPermissions.length : role.permissions?.length || 0;
    const isSelected = selectedRoleCode === role.code;

    return (
      <button
        onClick={() => setSelectedRoleCode(isSelected ? '' : role.code)}
        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
          isSelected
            ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
            : `${meta.bgColor} border hover:shadow-md`
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{roleIcons[role.code] || '🔐'}</span>
            <div>
              <div className={`font-semibold ${meta.color}`}>{meta.label}</div>
              <div className="text-xs text-white/50 mt-0.5">{role.code}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white/70">{adminCount}</div>
            <div className="text-xs text-white/50">명</div>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/60 line-clamp-2">{meta.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-white/50">
            권한 {permissionCount}개
          </span>
          <span className={`px-2 py-0.5 text-xs rounded ${meta.bgColor} ${meta.color}`}>
            {meta.scope}
          </span>
        </div>
      </button>
    );
  };

  return (
    <PageLayout>
      <DataContainer
          isLoading={isLoading}
          isEmpty={rolesWithPermissions.length === 0 && !isLoading}
          emptyIcon="🔐"
          emptyMessage="역할 정보를 불러올 수 없습니다"
          emptyDescription="역할 및 권한 데이터를 불러오는 중 문제가 발생했습니다."
          loadingMessage="역할 및 권한 정보를 불러오는 중..."
        >
          <div className="space-y-6">
            {/* 헤더 */}
            <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">역할 및 권한</h2>
                  <p className="mt-1 text-sm text-white/50">
                    시스템에 정의된 역할과 각 역할별 권한을 확인합니다
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin-management')}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  관리자 역할 할당
                </button>
              </div>

              {/* 통계 */}
              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="bg-purple-500/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{platformRoles.length}</div>
                  <div className="text-sm text-purple-600">플랫폼 역할</div>
                </div>
                <div className="bg-emerald-500/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-400">{companyRoles.length}</div>
                  <div className="text-sm text-emerald-400">회사 역할</div>
                </div>
                <div className="bg-green-500/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{adminPermissions.length}</div>
                  <div className="text-sm text-green-600">전체 권한</div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-white/60">{admins.length}</div>
                  <div className="text-sm text-white/60">전체 관리자</div>
                </div>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <h3 className="font-medium text-white">역할 기반 권한 관리</h3>
                  <p className="mt-1 text-sm text-emerald-300">
                    권한은 역할에 미리 할당되어 있으며, 관리자에게 역할을 부여하면 해당 역할의 권한이 자동으로 적용됩니다.
                    관리자에게 역할을 할당하려면 <strong>"관리자 역할 할당"</strong> 버튼을 클릭하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 역할 카드 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 플랫폼 역할 */}
              <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xl">🌐</span>
                  <h3 className="text-lg font-semibold text-white">플랫폼 역할</h3>
                  <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-700 rounded">
                    본사/협회
                  </span>
                </div>
                <p className="text-sm text-white/50 mb-4">
                  플랫폼 전체에 대한 접근 권한을 가진 역할입니다.
                </p>
                <div className="space-y-3">
                  {platformRoles.map(role => (
                    <RoleCard key={role.code} role={role} />
                  ))}
                </div>
              </div>

              {/* 회사 역할 */}
              <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xl">🏢</span>
                  <h3 className="text-lg font-semibold text-white">회사 역할</h3>
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded">
                    가맹점
                  </span>
                </div>
                <p className="text-sm text-white/50 mb-4">
                  소속 회사 내에서의 접근 권한을 가진 역할입니다.
                </p>
                <div className="space-y-3">
                  {companyRoles.map(role => (
                    <RoleCard key={role.code} role={role} />
                  ))}
                </div>
              </div>
            </div>

            {/* 선택된 역할의 권한 상세 */}
            {selectedRole && (
              <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/15 bg-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{roleIcons[selectedRole.code] || '🔐'}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {getRoleMeta(selectedRole.code).label} 권한
                        </h3>
                        <p className="text-sm text-white/50">
                          {getRoleMeta(selectedRole.code).description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedRoleCode('')}
                      className="text-white/40 hover:text-white/60"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {adminPermissions.map(permission => {
                      const hasPermission = roleHasPermission(selectedRole, permission.code);
                      const meta = permissionMeta[permission.code];
                      return (
                        <div
                          key={permission.code}
                          className={`flex items-start p-3 rounded-lg border transition-all ${
                            hasPermission
                              ? 'bg-green-500/10 border-green-200'
                              : 'bg-white/5 border-white/15 opacity-50'
                          }`}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 ${
                            hasPermission
                              ? 'bg-green-500 border-green-500'
                              : 'bg-white/10 border-white/15'
                          } flex items-center justify-center`}>
                            {hasPermission && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span>{meta?.icon || '📌'}</span>
                                <span className={`text-sm font-medium ${hasPermission ? 'text-green-900' : 'text-white/50'}`}>
                                  {meta?.name || permission.code}
                                </span>
                              </div>
                              {meta && getLevelBadge(meta.level)}
                            </div>
                            <div className={`text-xs mt-1 ${hasPermission ? 'text-green-700' : 'text-white/40'}`}>
                              {meta?.description || permission.description}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 역할별 권한 매트릭스 */}
            <div className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/15 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/15">
                <h3 className="text-lg font-medium text-white">역할별 권한 매트릭스</h3>
                <p className="mt-1 text-sm text-white/50">각 역할에 할당된 권한을 한눈에 확인할 수 있습니다</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/15">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/50 uppercase tracking-wider sticky left-0 bg-white/5 z-10">
                        권한
                      </th>
                      {/* 플랫폼 역할 헤더 */}
                      {platformRoles.map(role => (
                        <th key={role.code} className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider bg-purple-500/10">
                          <div className={`inline-flex items-center px-2 py-1 rounded ${getRoleMeta(role.code).bgColor} ${getRoleMeta(role.code).color}`}>
                            <span className="mr-1">{roleIcons[role.code]}</span>
                            <span className="whitespace-nowrap">{getRoleMeta(role.code).label}</span>
                          </div>
                        </th>
                      ))}
                      {/* 회사 역할 헤더 */}
                      {companyRoles.map(role => (
                        <th key={role.code} className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider bg-emerald-500/10">
                          <div className={`inline-flex items-center px-2 py-1 rounded ${getRoleMeta(role.code).bgColor} ${getRoleMeta(role.code).color}`}>
                            <span className="mr-1">{roleIcons[role.code]}</span>
                            <span className="whitespace-nowrap">{getRoleMeta(role.code).label}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white/10 divide-y divide-white/15">
                    {adminPermissions.map(permission => {
                      const meta = permissionMeta[permission.code];
                      return (
                        <tr key={permission.code} className="hover:bg-white/5">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-white sticky left-0 bg-white/10 z-10">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{meta?.icon || '📌'}</span>
                              <div>
                                <div className="font-medium">{meta?.name || permission.code}</div>
                                <div className="text-xs text-white/40">{permission.code}</div>
                              </div>
                            </div>
                          </td>
                          {/* 플랫폼 역할 권한 */}
                          {platformRoles.map(role => {
                            const hasP = roleHasPermission(role, permission.code);
                            return (
                              <td key={role.code} className="px-3 py-3 text-center bg-purple-500/10">
                                {hasP ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500/20 text-green-400 rounded-full">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-white/10 text-white/30 rounded-full">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {/* 회사 역할 권한 */}
                          {companyRoles.map(role => {
                            const hasP = roleHasPermission(role, permission.code);
                            return (
                              <td key={role.code} className="px-3 py-3 text-center bg-emerald-500/10">
                                {hasP ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500/20 text-green-400 rounded-full">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 bg-white/10 text-white/30 rounded-full">
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

            {/* 하단 안내 */}
            <div className="text-center text-sm text-white/50">
              역할을 클릭하면 해당 역할의 상세 권한을 확인할 수 있습니다.
            </div>
          </div>
        </DataContainer>
    </PageLayout>
  );
};
