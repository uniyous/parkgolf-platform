import React from 'react';

interface PolicyInheritanceBadgeProps {
  inherited: boolean;
  inheritedFrom: string | null;
}

const scopeLabels: Record<string, string> = {
  PLATFORM: '플랫폼',
  COMPANY: '가맹점',
  CLUB: '골프장',
};

export const PolicyInheritanceBadge: React.FC<PolicyInheritanceBadgeProps> = ({
  inherited,
  inheritedFrom,
}) => {
  if (!inherited) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
        독립 설정
      </span>
    );
  }

  const fromLabel = inheritedFrom ? scopeLabels[inheritedFrom] || inheritedFrom : '상위';

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
      {fromLabel} 상속
    </span>
  );
};
