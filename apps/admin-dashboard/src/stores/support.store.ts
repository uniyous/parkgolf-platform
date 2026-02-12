import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Company } from '@/types/company';

interface SupportState {
  /** 현재 지원 중인 가맹점 */
  selectedCompany: Company | null;
  /** 가맹점 선택 모드 활성화 */
  isSupportMode: boolean;

  setSelectedCompany: (company: Company | null) => void;
  clearSupport: () => void;
}

/**
 * 본사/협회 관리자가 admin-dashboard에서 가맹점을 지원할 때 사용하는 상태
 * - selectedCompany: 지원 대상 가맹점
 * - isSupportMode: 가맹점 지원 모드 활성화 여부
 */
export const useSupportStore = create<SupportState>()(
  persist(
    (set) => ({
      selectedCompany: null,
      isSupportMode: false,

      setSelectedCompany: (company) =>
        set({
          selectedCompany: company,
          isSupportMode: !!company,
        }),

      clearSupport: () =>
        set({
          selectedCompany: null,
          isSupportMode: false,
        }),
    }),
    {
      name: 'support-storage',
      partialize: (state) => ({
        selectedCompany: state.selectedCompany,
        isSupportMode: state.isSupportMode,
      }),
    },
  ),
);
