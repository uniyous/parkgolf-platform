import React from 'react';
import { Shield, ShieldCheck, Eye, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import {
  ADMIN_ROLE_LABELS,
  ADMIN_ROLE_COLORS,
  ROLE_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  ADMIN_HIERARCHY,
  PLATFORM_ROLES,
  COMPANY_ROLES,
} from '@/utils/admin-permissions';
import type { AdminRole, Permission } from '@/types';

// ===== Helper =====

const getRoleIcon = (role: AdminRole) => {
  if (role === 'PLATFORM_ADMIN') return ShieldCheck;
  if (role.startsWith('PLATFORM_')) return Shield;
  if (role === 'COMPANY_ADMIN') return Building2;
  return Eye;
};

// ===== Component =====

export const RolesPage: React.FC = () => {
  const renderRoleCard = (role: AdminRole) => {
    const Icon = getRoleIcon(role);
    const label = ADMIN_ROLE_LABELS[role];
    const colorClass = ADMIN_ROLE_COLORS[role];
    const permissions = ROLE_PERMISSIONS[role] || [];
    const hierarchy = ADMIN_HIERARCHY[role];

    return (
      <Card key={role} variant="default" className="p-5">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{label}</h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/40">
                Level {hierarchy}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/40">{role}</p>

            {/* Permissions */}
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-white/50">부여된 권한</p>
              <div className="flex flex-wrap gap-1">
                {permissions.map((perm: Permission) => {
                  const permLabel = ADMIN_PERMISSION_LABELS[perm] || perm;
                  const isAll = perm === 'ALL';
                  return (
                    <span
                      key={perm}
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        isAll
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {permLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">역할 및 권한</h1>
        <p className="mt-1 text-sm text-white/50">
          역할별 권한 계층 구조를 확인합니다
        </p>
      </div>

      {/* Platform Roles */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">플랫폼 역할</h2>
          <span className="text-xs text-white/40">본사/협회 관리</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLATFORM_ROLES.map((role) => renderRoleCard(role))}
        </div>
      </div>

      {/* Company Roles */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-green-400" />
          <h2 className="text-lg font-semibold text-white">회사 역할</h2>
          <span className="text-xs text-white/40">가맹점 관리</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COMPANY_ROLES.map((role) => renderRoleCard(role))}
        </div>
      </div>

      {/* Permission Legend */}
      <Card variant="default">
        <CardHeader>
          <CardTitle>권한 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(ADMIN_PERMISSION_LABELS).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500/50" />
                <div>
                  <p className="text-xs font-medium text-white/70">{label}</p>
                  <p className="text-[10px] text-white/30">{key}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
