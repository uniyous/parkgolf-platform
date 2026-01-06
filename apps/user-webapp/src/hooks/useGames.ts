import { useState } from 'react';
import {
  useGamesQuery,
  useGameQuery,
  useGamesByClubQuery,
  useAvailableTimeSlotsQuery,
} from './queries/game';

export const useGames = (clubId?: number) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const {
    data: gamesResponse,
    isLoading,
    error,
    refetch,
  } = useGamesQuery(clubId, page, limit);

  const nextPage = () => {
    if (gamesResponse && page * limit < gamesResponse.total) {
      setPage((p) => p + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  };

  return {
    games: gamesResponse?.data || [],
    total: gamesResponse?.total || 0,
    page,
    limit,
    isLoading,
    error,
    refetch,
    nextPage,
    prevPage,
    setPage,
  };
};

export const useGame = (gameId: number) => {
  const { data: game, isLoading, error, refetch } = useGameQuery(gameId);

  return {
    game,
    isLoading,
    error,
    refetch,
  };
};

export const useClubGames = (clubId: number) => {
  const { data: games, isLoading, error, refetch } = useGamesByClubQuery(clubId);

  return {
    games: games || [],
    isLoading,
    error,
    refetch,
  };
};

export const useGameTimeSlots = (gameId: number, date: string) => {
  const { data: timeSlots, isLoading, error, refetch } = useAvailableTimeSlotsQuery(gameId, date);

  return {
    timeSlots: timeSlots || [],
    isLoading,
    error,
    refetch,
  };
};
