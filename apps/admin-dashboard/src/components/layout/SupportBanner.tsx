import React from 'react';
import { Building2, ChevronDown, ArrowLeft } from 'lucide-react';
import { useSupportStore } from '@/stores/support.store';
import { useNavigate } from 'react-router-dom';

/**
 * 본사/협회 관리자가 가맹점 지원 모드일 때 상단에 표시되는 배너
 */
export const SupportBanner: React.FC = () => {
  const { selectedCompany, isSupportMode, clearSupport } = useSupportStore();
  const navigate = useNavigate();

  if (!isSupportMode || !selectedCompany) return null;

  const handleChange = () => {
    clearSupport();
    navigate('/select-company');
  };

  const handleBackToPlatform = () => {
    clearSupport();
    // platform-dashboard URL로 이동 (외부 앱)
    const platformUrl = import.meta.env.VITE_PLATFORM_DASHBOARD_URL || '/';
    window.location.href = platformUrl;
  };

  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        <span className="font-medium">{selectedCompany.name}</span>
        <span className="text-blue-200">지원 중</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleChange}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-500 transition-colors"
        >
          변경
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={handleBackToPlatform}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-500 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          플랫폼으로
        </button>
      </div>
    </div>
  );
};
