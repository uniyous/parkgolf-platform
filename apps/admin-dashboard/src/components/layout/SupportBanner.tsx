import React from 'react';
import { Building2, ChevronDown } from 'lucide-react';
import { useSupportStore } from '@/stores/support.store';
import { useNavigate } from 'react-router-dom';

/**
 * 본사/협회 관리자가 가맹점 지원 모드일 때 상단에 표시되는 배너
 * "변경" 클릭 시 clearSupport() → PrivateRoute가 /select-company로 리다이렉트
 */
export const SupportBanner: React.FC = () => {
  const { selectedCompany, isSupportMode, clearSupport } = useSupportStore();
  const navigate = useNavigate();

  if (!isSupportMode || !selectedCompany) return null;

  const handleChange = () => {
    clearSupport();
    navigate('/select-company');
  };

  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        <span className="font-medium">{selectedCompany.name}</span>
        <span className="text-blue-200">지원 중</span>
      </div>
      <button
        onClick={handleChange}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-500 transition-colors"
      >
        변경
        <ChevronDown className="w-3 h-3" />
      </button>
    </div>
  );
};
