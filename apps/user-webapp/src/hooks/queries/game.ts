import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gameApi, type GameSearchParams } from '@/lib/api/gameApi';
import { gameKeys } from './keys';

// Get Games Query
export const useGamesQuery = (clubId?: number, page = 1, limit = 20) => {
  return useQuery({
    queryKey: gameKeys.list(clubId),
    queryFn: () => gameApi.getGames(clubId, page, limit),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

// Search Games Query
export const useSearchGamesQuery = (params: GameSearchParams) => {
  return useQuery({
    queryKey: gameKeys.search(params),
    queryFn: () => gameApi.searchGames(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });
};

// Get Games By Club Query
export const useGamesByClubQuery = (clubId: number) => {
  return useQuery({
    queryKey: gameKeys.byClub(clubId),
    queryFn: () => gameApi.getGamesByClub(clubId),
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

// Get Game By ID Query
export const useGameQuery = (gameId: number) => {
  return useQuery({
    queryKey: gameKeys.detail(gameId),
    queryFn: () => gameApi.getGameById(gameId),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

// Get Time Slots Query
export const useGameTimeSlotsQuery = (gameId: number, date?: string) => {
  return useQuery({
    queryKey: gameKeys.timeSlots(gameId, date),
    queryFn: () => gameApi.getTimeSlots(gameId, date),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

// Get Available Time Slots Query
export const useAvailableTimeSlotsQuery = (gameId: number, date: string) => {
  return useQuery({
    queryKey: gameKeys.availableTimeSlots(gameId, date),
    queryFn: () => gameApi.getAvailableTimeSlots(gameId, date),
    enabled: !!gameId && !!date,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};
