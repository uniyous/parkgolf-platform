import { create } from 'zustand';
import type { Course, Hole } from '@/types';
import type { Club } from '@/lib/api/courses';

interface CourseFilters {
  search: string;
  status: string;
  companyId: number | null;
  clubId: number | null;
}

interface CourseUIState {
  // Selection
  selectedCourse: Course | null;
  selectedClub: Club | null;
  selectedHole: Hole | null;
  selectedCourseIds: number[];

  // Filters
  filters: CourseFilters;

  // Pagination
  page: number;
  limit: number;

  // View mode
  viewMode: 'list' | 'grid' | 'detail';

  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isHoleModalOpen: boolean;

  // Actions
  setSelectedCourse: (course: Course | null) => void;
  setSelectedClub: (club: Club | null) => void;
  setSelectedHole: (hole: Hole | null) => void;
  setSelectedCourseIds: (ids: number[]) => void;
  clearSelection: () => void;

  setFilters: (filters: Partial<CourseFilters>) => void;
  resetFilters: () => void;

  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setViewMode: (mode: 'list' | 'grid' | 'detail') => void;

  openCreateModal: () => void;
  openEditModal: (course: Course) => void;
  openDeleteModal: (course: Course) => void;
  openHoleModal: (hole?: Hole) => void;
  closeModals: () => void;
}

const initialFilters: CourseFilters = {
  search: '',
  status: '',
  companyId: null,
  clubId: null,
};

export const useCourseStore = create<CourseUIState>((set) => ({
  // Initial state
  selectedCourse: null,
  selectedClub: null,
  selectedHole: null,
  selectedCourseIds: [],
  filters: initialFilters,
  page: 1,
  limit: 20,
  viewMode: 'list',
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  isHoleModalOpen: false,

  // Actions
  setSelectedCourse: (course) => set({ selectedCourse: course }),
  setSelectedClub: (club) => set({ selectedClub: club }),
  setSelectedHole: (hole) => set({ selectedHole: hole }),
  setSelectedCourseIds: (ids) => set({ selectedCourseIds: ids }),
  clearSelection: () =>
    set({
      selectedCourse: null,
      selectedClub: null,
      selectedHole: null,
      selectedCourseIds: [],
    }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1,
    })),

  resetFilters: () => set({ filters: initialFilters, page: 1 }),

  setPage: (page) => set({ page }),
  setLimit: (limit) => set({ limit, page: 1 }),
  setViewMode: (mode) => set({ viewMode: mode }),

  openCreateModal: () => set({ isCreateModalOpen: true }),
  openEditModal: (course) => set({ selectedCourse: course, isEditModalOpen: true }),
  openDeleteModal: (course) => set({ selectedCourse: course, isDeleteModalOpen: true }),
  openHoleModal: (hole) => set({ selectedHole: hole || null, isHoleModalOpen: true }),
  closeModals: () =>
    set({
      isCreateModalOpen: false,
      isEditModalOpen: false,
      isDeleteModalOpen: false,
      isHoleModalOpen: false,
    }),
}));
