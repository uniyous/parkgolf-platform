import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  gamesApi,
  type GameFilter,
  type GameTimeSlotFilter,
  type CreateGameDto,
  type UpdateGameDto,
  type CreateGameWeeklyScheduleDto,
  type UpdateGameWeeklyScheduleDto,
  type CreateGameTimeSlotDto,
  type UpdateGameTimeSlotDto,
} from '@/lib/api/gamesApi';
import { gameKeys } from './keys';

// ============================================
// Game Queries
// ============================================

export const useGames = (filters?: GameFilter) => {
  return useQuery({
    queryKey: gameKeys.list(filters),
    queryFn: () => gamesApi.getGames(filters),
  });
};

export const useGame = (id: number) => {
  return useQuery({
    queryKey: gameKeys.detail(id),
    queryFn: () => gamesApi.getGameById(id),
    enabled: !!id,
  });
};

export const useGamesByClub = (clubId: number) => {
  return useQuery({
    queryKey: gameKeys.byClub(clubId),
    queryFn: () => gamesApi.getGamesByClub(clubId),
    enabled: !!clubId,
  });
};

// ============================================
// Weekly Schedule Queries
// ============================================

export const useGameWeeklySchedules = (gameId: number) => {
  return useQuery({
    queryKey: gameKeys.weeklySchedules(gameId),
    queryFn: () => gamesApi.getWeeklySchedules(gameId),
    enabled: !!gameId,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

// ============================================
// Time Slot Queries
// ============================================

export const useGameTimeSlots = (gameId: number, filter?: GameTimeSlotFilter) => {
  return useQuery({
    queryKey: gameKeys.timeSlots(gameId, filter),
    queryFn: () => gamesApi.getTimeSlots(gameId, filter),
    enabled: !!gameId,
  });
};

export const useGameTimeSlotStats = (filter?: GameTimeSlotFilter) => {
  return useQuery({
    queryKey: gameKeys.timeSlotStats(filter),
    queryFn: () => gamesApi.getTimeSlotStats(filter),
  });
};

// ============================================
// Game Mutations
// ============================================

export const useCreateGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGameDto) => gamesApi.createGame(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
      if (variables.clubId) {
        queryClient.invalidateQueries({ queryKey: gameKeys.byClub(variables.clubId) });
      }
    },
  });
};

export const useUpdateGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGameDto }) =>
      gamesApi.updateGame(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(id) });
    },
  });
};

export const useDeleteGame = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => gamesApi.deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
    },
  });
};

// ============================================
// Weekly Schedule Mutations
// ============================================

export const useCreateWeeklySchedule = () => {
  return useMutation({
    meta: { globalLoading: false }, // 로컬 프로그레스 바 사용
    mutationFn: ({ gameId, data }: { gameId: number; data: CreateGameWeeklyScheduleDto }) =>
      gamesApi.createWeeklySchedule(gameId, data),
    // onSuccess에서 invalidate 하지 않음 - 마법사에서 완료 후 refetch() 호출
  });
};

export const useUpdateWeeklySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gameId,
      scheduleId,
      data,
    }: {
      gameId: number;
      scheduleId: number;
      data: UpdateGameWeeklyScheduleDto;
    }) => gamesApi.updateWeeklySchedule(gameId, scheduleId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.weeklySchedules(gameId) });
    },
  });
};

export const useDeleteWeeklySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, scheduleId }: { gameId: number; scheduleId: number }) =>
      gamesApi.deleteWeeklySchedule(gameId, scheduleId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.weeklySchedules(gameId) });
    },
  });
};

// ============================================
// Time Slot Mutations
// ============================================

export const useCreateTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: number; data: CreateGameTimeSlotDto }) =>
      gamesApi.createTimeSlot(gameId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
    },
  });
};

export const useBulkCreateTimeSlots = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, timeSlots }: { gameId: number; timeSlots: CreateGameTimeSlotDto[] }) =>
      gamesApi.bulkCreateTimeSlots(gameId, timeSlots),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
    },
  });
};

export const useGenerateTimeSlots = () => {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { globalLoading: false },
    mutationFn: ({
      gameId,
      startDate,
      endDate,
    }: {
      gameId: number;
      startDate: string;
      endDate: string;
    }) => gamesApi.generateTimeSlots(gameId, startDate, endDate),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
    },
  });
};

export const useUpdateTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gameId,
      timeSlotId,
      data,
    }: {
      gameId: number;
      timeSlotId: number;
      data: UpdateGameTimeSlotDto;
    }) => gamesApi.updateTimeSlot(gameId, timeSlotId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
    },
  });
};

export const useDeleteTimeSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, timeSlotId }: { gameId: number; timeSlotId: number }) =>
      gamesApi.deleteTimeSlot(gameId, timeSlotId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
    },
  });
};
