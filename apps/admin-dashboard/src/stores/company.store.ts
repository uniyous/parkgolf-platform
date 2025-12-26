import { create } from 'zustand';
import type { Company, CompanyStatus } from '@/types/company';

interface CompanyFilters {
  search: string;
  status: CompanyStatus | '';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface CompanyUIState {
  selectedCompany: Company | null;
  selectedCompanyIds: number[];
  filters: CompanyFilters;
  page: number;
  limit: number;
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;

  setSelectedCompany: (company: Company | null) => void;
  setSelectedCompanyIds: (ids: number[]) => void;
  toggleCompanySelection: (id: number) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<CompanyFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  openCreateModal: () => void;
  openEditModal: (company: Company) => void;
  openDeleteModal: (company: Company) => void;
  closeModals: () => void;
}

const initialFilters: CompanyFilters = {
  search: '',
  status: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useCompanyStore = create<CompanyUIState>((set) => ({
  selectedCompany: null,
  selectedCompanyIds: [],
  filters: initialFilters,
  page: 1,
  limit: 20,
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,

  setSelectedCompany: (company) => set({ selectedCompany: company }),
  setSelectedCompanyIds: (ids) => set({ selectedCompanyIds: ids }),
  toggleCompanySelection: (id) =>
    set((state) => ({
      selectedCompanyIds: state.selectedCompanyIds.includes(id)
        ? state.selectedCompanyIds.filter((i) => i !== id)
        : [...state.selectedCompanyIds, id],
    })),
  clearSelection: () => set({ selectedCompanyIds: [], selectedCompany: null }),
  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters }, page: 1 })),
  resetFilters: () => set({ filters: initialFilters, page: 1 }),
  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  openEditModal: (company) => set({ selectedCompany: company, isEditModalOpen: true }),
  openDeleteModal: (company) => set({ selectedCompany: company, isDeleteModalOpen: true }),
  closeModals: () =>
    set({ isCreateModalOpen: false, isEditModalOpen: false, isDeleteModalOpen: false }),
}));
