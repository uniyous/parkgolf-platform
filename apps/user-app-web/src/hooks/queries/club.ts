import { useQuery } from '@tanstack/react-query';
import { clubApi } from '@/lib/api/clubApi';
import { gameApi } from '@/lib/api/gameApi';
import { clubKeys, gameKeys } from './keys';

export const useClubDetailQuery = (id: number) => {
  return useQuery({
    queryKey: clubKeys.detail(id),
    queryFn: () => clubApi.getClubById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useGamesByClubQuery = (clubId: number) => {
  return useQuery({
    queryKey: gameKeys.byClub(clubId),
    queryFn: () => gameApi.getGamesByClub(clubId),
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};
