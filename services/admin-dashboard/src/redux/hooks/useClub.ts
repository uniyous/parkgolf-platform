import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import {
  fetchClubs,
  fetchClubById,
  createClub,
  updateClub,
  deleteClub,
  fetchClubsByCompany,
  fetchCoursesByClub,
  searchClubs,
  fetchClubStats,
  clearErrors,
  setFilters,
  clearFilters,
  setSelectedClub,
  setSelectedCompanyId,
  clearSearchResults,
  resetState,
} from '../slices/clubSlice';
import {
  selectClubs,
  selectClubsTotalCount,
  selectClubsPagination,
  selectSelectedClub,
  selectSelectedClubCourses,
  selectCompanyClubs,
  selectSelectedCompanyId,
  selectClubSearchResults,
  selectClubStats,
  selectClubLoading,
  selectClubErrors,
  selectClubFilters,
  selectClubSummary,
  selectActiveClubs,
  selectClubsGroupedByLocation,
} from '../selectors/clubSelectors';
import type { ClubFilters, CreateClubDto, UpdateClubDto } from '../types/clubTypes';

export const useClub = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const clubs = useAppSelector(selectClubs);
  const totalCount = useAppSelector(selectClubsTotalCount);
  const pagination = useAppSelector(selectClubsPagination);
  const selectedClub = useAppSelector(selectSelectedClub);
  const selectedClubCourses = useAppSelector(selectSelectedClubCourses);
  const companyClubs = useAppSelector(selectCompanyClubs);
  const selectedCompanyId = useAppSelector(selectSelectedCompanyId);
  const searchResults = useAppSelector(selectClubSearchResults);
  const stats = useAppSelector(selectClubStats);
  const loading = useAppSelector(selectClubLoading);
  const errors = useAppSelector(selectClubErrors);
  const filters = useAppSelector(selectClubFilters);
  const summary = useAppSelector(selectClubSummary);
  const activeClubs = useAppSelector(selectActiveClubs);
  const clubsByLocation = useAppSelector(selectClubsGroupedByLocation);

  // Actions
  const loadClubs = useCallback(
    (filters?: ClubFilters) => {
      return dispatch(fetchClubs(filters || {}));
    },
    [dispatch]
  );

  const loadClubById = useCallback(
    (id: number) => {
      return dispatch(fetchClubById(id));
    },
    [dispatch]
  );

  const createNewClub = useCallback(
    (clubData: CreateClubDto) => {
      return dispatch(createClub(clubData));
    },
    [dispatch]
  );

  const updateExistingClub = useCallback(
    (id: number, data: UpdateClubDto) => {
      return dispatch(updateClub({ id, data }));
    },
    [dispatch]
  );

  const removeClub = useCallback(
    (id: number) => {
      return dispatch(deleteClub(id));
    },
    [dispatch]
  );

  const loadClubsByCompany = useCallback(
    (companyId: number) => {
      return dispatch(fetchClubsByCompany(companyId));
    },
    [dispatch]
  );

  const loadCoursesByClub = useCallback(
    (clubId: number) => {
      return dispatch(fetchCoursesByClub(clubId));
    },
    [dispatch]
  );

  const searchForClubs = useCallback(
    (query: string) => {
      return dispatch(searchClubs(query));
    },
    [dispatch]
  );

  const loadClubStats = useCallback(() => {
    return dispatch(fetchClubStats());
  }, [dispatch]);

  // State management actions
  const clearAllErrors = useCallback(() => {
    dispatch(clearErrors());
  }, [dispatch]);

  const updateFilters = useCallback(
    (newFilters: ClubFilters) => {
      dispatch(setFilters(newFilters));
    },
    [dispatch]
  );

  const resetFilters = useCallback(() => {
    dispatch(clearFilters());
  }, [dispatch]);

  const selectClubAction = useCallback(
    (club: any) => {
      dispatch(setSelectedClub(club));
    },
    [dispatch]
  );

  const selectCompanyId = useCallback(
    (companyId: number | null) => {
      dispatch(setSelectedCompanyId(companyId));
    },
    [dispatch]
  );

  const clearSearch = useCallback(() => {
    dispatch(clearSearchResults());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetState());
  }, [dispatch]);

  // Utility functions
  const refreshClubs = useCallback(() => {
    return loadClubs(filters);
  }, [loadClubs, filters]);

  const getClubById = useCallback(
    (id: number) => {
      return clubs.find(c => c.id === id);
    },
    [clubs]
  );

  const isClubSelected = useCallback(
    (id: number) => {
      return selectedClub?.id === id;
    },
    [selectedClub]
  );

  // Loading state helpers
  const isLoading = loading.list || loading.detail || loading.create || loading.update || loading.delete;
  const hasError = Object.values(errors).some(error => error !== null);

  return {
    // Data
    clubs,
    totalCount,
    pagination,
    selectedClub,
    selectedClubCourses,
    companyClubs,
    selectedCompanyId,
    searchResults,
    stats,
    summary,
    activeClubs,
    clubsByLocation,
    
    // State
    loading,
    errors,
    filters,
    isLoading,
    hasError,
    
    // Actions
    loadClubs,
    loadClubById,
    createNewClub,
    updateExistingClub,
    removeClub,
    loadClubsByCompany,
    loadCoursesByClub,
    searchForClubs,
    loadClubStats,
    
    // State management
    clearAllErrors,
    updateFilters,
    resetFilters,
    selectClub: selectClubAction,
    selectCompanyId,
    clearSearch,
    reset,
    
    // Utilities
    refreshClubs,
    getClubById,
    isClubSelected,
  };
};