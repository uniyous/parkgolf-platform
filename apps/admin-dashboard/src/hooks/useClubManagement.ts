import { useState, useCallback, useMemo } from 'react';
import { useClubs, useClub as useClubQuery, useSearchClubs, useCreateClub, useUpdateClub, useDeleteClub } from './queries';
import type { Club, ClubFilters } from '@/types/club';
import type { CreateClubDto, UpdateClubDto } from '@/lib/api/courses';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export const useClubManagement = () => {
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ClubFilters>({});
  const [searchKeyword, setSearchKeyword] = useState('');

  // Queries
  const clubsQuery = useClubs(filters);
  const selectedClubQuery = useClubQuery(selectedClubId ?? 0);
  const searchQuery = useSearchClubs(searchKeyword);

  // Mutations
  const createClubMutation = useCreateClub();
  const updateClubMutation = useUpdateClub();
  const deleteClubMutation = useDeleteClub();

  // Derived data - API returns PaginatedResponse<Club> with { data: Club[], pagination: {...} }
  const clubs = useMemo(() => {
    if (searchKeyword && searchQuery.data) {
      return Array.isArray(searchQuery.data) ? searchQuery.data : [];
    }
    // clubsQuery.data is PaginatedResponse<Club>, extract the data array
    const clubData = clubsQuery.data;
    if (clubData && 'data' in clubData) {
      return clubData.data ?? [];
    }
    return Array.isArray(clubData) ? clubData : [];
  }, [clubsQuery.data, searchQuery.data, searchKeyword]);

  const selectedClub = selectedClubQuery.data ?? null;
  const selectedClubCourses = selectedClub?.courses ?? [];

  // Pagination - extract from API response
  const pagination = useMemo(() => {
    const paginationData = clubsQuery.data && 'pagination' in clubsQuery.data
      ? clubsQuery.data.pagination
      : null;
    return {
      totalCount: paginationData?.total ?? clubs.length,
      currentPage: paginationData?.page ?? 1,
      totalPages: paginationData?.totalPages ?? 1,
      pageSize: paginationData?.limit ?? 20,
    };
  }, [clubsQuery.data, clubs.length]);

  // Loading states
  const loading = {
    list: clubsQuery.isLoading,
    detail: selectedClubQuery.isLoading,
    search: searchQuery.isLoading,
    create: createClubMutation.isPending,
    update: updateClubMutation.isPending,
    delete: deleteClubMutation.isPending,
  };

  // Error states
  const errors = {
    list: clubsQuery.error?.message ?? null,
    detail: selectedClubQuery.error?.message ?? null,
    search: searchQuery.error?.message ?? null,
    create: createClubMutation.error?.message ?? null,
    update: updateClubMutation.error?.message ?? null,
    delete: deleteClubMutation.error?.message ?? null,
  };

  // Actions
  const loadClubs = useCallback(() => {
    setSearchKeyword('');
    clubsQuery.refetch();
  }, [clubsQuery]);

  const loadClubById = useCallback((id: number) => {
    setSelectedClubId(id);
  }, []);

  const selectClub = useCallback((club: Club | null) => {
    if (club) {
      setSelectedClubId(club.id);
      setViewModeState('detail');
    } else {
      setSelectedClubId(null);
      setViewModeState('list');
    }
  }, []);

  const clearSelectedClub = useCallback(() => {
    setSelectedClubId(null);
    setViewModeState('list');
  }, []);

  const updateFilters = useCallback((newFilters: Partial<ClubFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const searchForClubs = useCallback(async (keyword: string) => {
    setSearchKeyword(keyword);
  }, []);

  const clearAllErrors = useCallback(() => {
    // Errors are automatically cleared on next successful query
  }, []);

  const createClub = useCallback(async (data: CreateClubDto) => {
    const result = await createClubMutation.mutateAsync(data);
    setViewModeState('list');
    return result;
  }, [createClubMutation]);

  const updateExistingClub = useCallback(async (id: number, data: UpdateClubDto) => {
    const result = await updateClubMutation.mutateAsync({ id, data });
    return result;
  }, [updateClubMutation]);

  const removeClub = useCallback(async (id: number) => {
    await deleteClubMutation.mutateAsync(id);
    setSelectedClubId(null);
    setViewModeState('list');
  }, [deleteClubMutation]);

  // View mode actions
  const backToList = useCallback(() => {
    setViewModeState('list');
    setSelectedClubId(null);
  }, []);

  const createClubMode = useCallback(() => {
    setSelectedClubId(null);
    setViewModeState('create');
  }, []);

  const editClub = useCallback((club: Club) => {
    setSelectedClubId(club.id);
    setViewModeState('edit');
  }, []);

  return {
    // Data
    clubs,
    selectedClub,
    selectedClubCourses,
    viewMode: viewModeState,
    pagination,
    filters,

    // States
    loading,
    errors,

    // Actions (flat for backward compatibility)
    loadClubs,
    loadClubById,
    selectClub,
    clearSelectedClub,
    updateFilters,
    searchForClubs,
    clearAllErrors,
    createClub,
    updateExistingClub,
    removeClub,
    backToList,
    createClubMode,
    editClub,
    setFilters,

    // Actions object (for new code)
    actions: {
      loadClubs,
      loadClubById,
      selectClub,
      clearSelectedClub,
      updateFilters,
      searchForClubs,
      clearAllErrors,
      createClub,
      updateExistingClub,
      removeClub,
      backToList,
      createClubMode,
      editClub,
    },
  };
};

// Alias for backward compatibility
export const useClub = useClubManagement;
