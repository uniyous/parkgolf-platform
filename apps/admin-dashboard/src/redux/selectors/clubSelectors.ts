import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Base selector
const selectClubState = (state: RootState) => state.club;

// Club list selectors
export const selectClubs = createSelector(
  [selectClubState],
  (clubState) => clubState.clubs
);

export const selectClubsTotalCount = createSelector(
  [selectClubState],
  (clubState) => clubState.totalCount
);

export const selectClubsPagination = createSelector(
  [selectClubState],
  (clubState) => ({
    currentPage: clubState.currentPage,
    totalPages: clubState.totalPages,
    totalCount: clubState.totalCount,
  })
);

// Selected club selectors
export const selectSelectedClub = createSelector(
  [selectClubState],
  (clubState) => clubState.selectedClub
);

export const selectSelectedClubCourses = createSelector(
  [selectClubState],
  (clubState) => clubState.selectedClubCourses
);

// Company clubs selectors
export const selectCompanyClubs = createSelector(
  [selectClubState],
  (clubState) => clubState.companyClubs
);

export const selectSelectedCompanyId = createSelector(
  [selectClubState],
  (clubState) => clubState.selectedCompanyId
);

// Search selectors
export const selectClubSearchResults = createSelector(
  [selectClubState],
  (clubState) => clubState.searchResults
);

// Stats selectors
export const selectClubStats = createSelector(
  [selectClubState],
  (clubState) => clubState.stats
);

// Loading selectors
export const selectClubLoading = createSelector(
  [selectClubState],
  (clubState) => clubState.loading
);

export const selectClubListLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.list
);

export const selectClubDetailLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.detail
);

export const selectClubCreateLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.create
);

export const selectClubUpdateLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.update
);

export const selectClubDeleteLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.delete
);

export const selectClubCoursesLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.courses
);

export const selectClubSearchLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.search
);

export const selectClubStatsLoading = createSelector(
  [selectClubLoading],
  (loading) => loading.stats
);

// Error selectors
export const selectClubErrors = createSelector(
  [selectClubState],
  (clubState) => clubState.error
);

export const selectClubListError = createSelector(
  [selectClubErrors],
  (errors) => errors.list
);

export const selectClubDetailError = createSelector(
  [selectClubErrors],
  (errors) => errors.detail
);

export const selectClubCreateError = createSelector(
  [selectClubErrors],
  (errors) => errors.create
);

export const selectClubUpdateError = createSelector(
  [selectClubErrors],
  (errors) => errors.update
);

export const selectClubDeleteError = createSelector(
  [selectClubErrors],
  (errors) => errors.delete
);

// Filter selectors
export const selectClubFilters = createSelector(
  [selectClubState],
  (clubState) => clubState.filters
);

// Computed selectors
export const selectClubById = createSelector(
  [selectClubs, (state: RootState, id: number) => id],
  (clubs, id) => clubs.find(c => c.id === id)
);

export const selectClubsByStatus = createSelector(
  [selectClubs, (state: RootState, status: string) => status],
  (clubs, status) => clubs.filter(c => c.status === status)
);

export const selectActiveClubs = createSelector(
  [selectClubs],
  (clubs) => clubs.filter(c => c.status === 'ACTIVE')
);

export const selectClubsGroupedByLocation = createSelector(
  [selectClubs],
  (clubs) => {
    return clubs.reduce((acc, club) => {
      const location = club.location;
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(club);
      return acc;
    }, {} as Record<string, typeof clubs>);
  }
);

// Summary selectors
export const selectClubSummary = createSelector(
  [selectClubs],
  (clubs) => {
    const total = clubs.length;
    const active = clubs.filter(c => c.status === 'ACTIVE').length;
    const maintenance = clubs.filter(c => c.status === 'MAINTENANCE').length;
    const inactive = clubs.filter(c => c.status === 'INACTIVE').length;
    const totalHoles = clubs.reduce((sum, c) => sum + c.totalHoles, 0);
    const totalCourses = clubs.reduce((sum, c) => sum + c.totalCourses, 0);

    return {
      total,
      active,
      maintenance,
      inactive,
      totalHoles,
      totalCourses,
      averageHoles: total > 0 ? Math.round(totalHoles / total) : 0,
      averageCourses: total > 0 ? Math.round(totalCourses / total) : 0,
    };
  }
);