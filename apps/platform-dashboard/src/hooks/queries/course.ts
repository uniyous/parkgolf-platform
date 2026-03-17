import { useQuery } from '@tanstack/react-query';
import { courseApi } from '@/lib/api/courseApi';
import { clubKeys, gameKeys } from './keys';

export const useClubsByCompanyQuery = (companyId?: number) => {
  return useQuery({
    queryKey: clubKeys.byCompany(companyId!),
    queryFn: () => courseApi.getClubsByCompany(companyId!),
    enabled: !!companyId,
    meta: { silent: true },
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
