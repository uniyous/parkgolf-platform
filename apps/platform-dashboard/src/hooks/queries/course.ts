import { useQuery } from '@tanstack/react-query';
import { courseApi } from '@/lib/api/courseApi';
import { clubKeys, gameKeys } from './keys';
import type { ClubFilters } from '@/types/club';

export const useClubStatsQuery = () => {
  return useQuery({
    queryKey: clubKeys.stats(),
    queryFn: () => courseApi.getClubStats(),
    meta: { globalLoading: false },
  });
};

export const useClubsByCompanyQuery = (companyId?: number) => {
  return useQuery({
    queryKey: clubKeys.byCompany(companyId!),
    queryFn: () => courseApi.getClubsByCompany(companyId!),
    enabled: !!companyId,
    meta: { silent: true },
  });
};

export const useAllClubsQuery = (params?: ClubFilters) => {
  return useQuery({
    queryKey: clubKeys.list(params),
    queryFn: () => courseApi.getClubs(params),
    meta: { globalLoading: false },
  });
};

export const useClubDetailQuery = (id?: number) => {
  return useQuery({
    queryKey: clubKeys.detail(id!),
    queryFn: () => courseApi.getClubById(id!),
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

export const useGamesByCompanyQuery = (companyId?: number) => {
  return useQuery({
    queryKey: gameKeys.byCompany(companyId!),
    queryFn: () => courseApi.getGamesByCompany(companyId!),
    enabled: !!companyId,
    meta: { silent: true },
  });
};
