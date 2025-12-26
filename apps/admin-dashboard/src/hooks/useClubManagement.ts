import { useState, useCallback } from 'react';
import { useClubs, useClub as useClubQuery, useClubsByCompany, useCreateClub, useUpdateClub, useDeleteClub } from './queries';
import type { Club, ClubFilters } from '@/types/club';
import type { CreateClubDto, UpdateClubDto } from '@/lib/api/courses';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export const useClubManagement = () => {
  const [selectedClubState, setSelectedClubState] = useState<Club | null>(null);
  const [viewModeState, setViewModeState] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ClubFilters>({});

  // Queries
  const clubsQuery = useClubs(filters);
  const selectedClubQuery = useClubQuery(selectedClubState?.id ?? 0);

  // Mutations
  const createClubMutation = useCreateClub();
  const updateClubMutation = useUpdateClub();
  const deleteClubMutation = useDeleteClub();

  // Derived data
  const clubs = clubsQuery.data ?? [];
  const selectedClub = selectedClubQuery.data ?? selectedClubState;

  // Loading & Error
  const loading = {
    list: clubsQuery.isLoading,
    detail: selectedClubQuery.isLoading,
    create: createClubMutation.isPending,
    update: updateClubMutation.isPending,
    delete: deleteClubMutation.isPending,
  };

  const errors = {
    list: clubsQuery.error?.message ?? null,
    detail: selectedClubQuery.error?.message ?? null,
    create: createClubMutation.error?.message ?? null,
    update: updateClubMutation.error?.message ?? null,
    delete: deleteClubMutation.error?.message ?? null,
  };

  // Actions
  const loadClubs = useCallback(() => {
    clubsQuery.refetch();
  }, [clubsQuery]);

  const selectClub = useCallback((club: Club | null) => {
    setSelectedClubState(club);
    if (club) {
      setViewModeState('detail');
    } else {
      setViewModeState('list');
    }
  }, []);

  const clearSelectedClub = useCallback(() => {
    setSelectedClubState(null);
    setViewModeState('list');
  }, []);

  const createClub = useCallback(async (data: CreateClubDto) => {
    const result = await createClubMutation.mutateAsync(data);
    setViewModeState('list');
    return result;
  }, [createClubMutation]);

  const updateClubAction = useCallback(async (id: number, data: UpdateClubDto) => {
    const result = await updateClubMutation.mutateAsync({ id, data });
    setViewModeState('list');
    return result;
  }, [updateClubMutation]);

  const deleteClub = useCallback(async (id: number) => {
    await deleteClubMutation.mutateAsync(id);
    setSelectedClubState(null);
    setViewModeState('list');
  }, [deleteClubMutation]);

  // View mode actions
  const backToList = useCallback(() => {
    setViewModeState('list');
    setSelectedClubState(null);
  }, []);

  const createClubMode = useCallback(() => {
    setSelectedClubState(null);
    setViewModeState('create');
  }, []);

  const editClub = useCallback((club: Club) => {
    setSelectedClubState(club);
    setViewModeState('edit');
  }, []);

  return {
    clubs,
    selectedClub,
    viewMode: viewModeState,
    loading,
    errors,
    filters,
    setFilters,
    actions: {
      loadClubs,
      selectClub,
      clearSelectedClub,
      createClub,
      updateClub: updateClubAction,
      deleteClub,
      backToList,
      createClubMode,
      editClub,
    },
  };
};

// Alias for backward compatibility
export const useClub = useClubManagement;
