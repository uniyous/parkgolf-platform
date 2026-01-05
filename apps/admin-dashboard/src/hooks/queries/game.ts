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
import { showSuccessToast } from '@/lib/errors';

// ============================================
// Game Queries
// ============================================

export const useGamesQuery = (filters?: GameFilter) => {
  return useQuery({
    queryKey: gameKeys.list(filters),
    queryFn: () => gamesApi.getGames(filters),
    staleTime: 1000 * 60 * 5, // 5분간 fresh 유지
    refetchOnWindowFocus: false,
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useGameQuery = (id: number) => {
  return useQuery({
    queryKey: gameKeys.detail(id),
    queryFn: () => gamesApi.getGameById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

export const useGamesByClubQuery = (clubId: number) => {
  return useQuery({
    queryKey: gameKeys.byClub(clubId),
    queryFn: () => gamesApi.getGamesByClub(clubId),
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};

// ============================================
// Weekly Schedule Queries
// ============================================

export const useGameWeeklySchedulesQuery = (gameId: number) => {
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

export const useGameTimeSlotsQuery = (gameId: number, filter?: GameTimeSlotFilter) => {
  return useQuery({
    queryKey: gameKeys.timeSlots(gameId, filter),
    queryFn: () => gamesApi.getTimeSlots(gameId, filter),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5, // 5분간 fresh 상태 유지
    gcTime: 1000 * 60 * 30, // 30분간 캐시 유지
    refetchOnWindowFocus: false, // 창 포커스 시 리패치 방지
    placeholderData: (previousData) => previousData, // 이전 데이터 유지
    meta: { globalLoading: false }, // 로컬 로딩 사용
  });
};

export const useGameTimeSlotStatsQuery = (filter?: GameTimeSlotFilter) => {
  return useQuery({
    queryKey: gameKeys.timeSlotStats(filter),
    queryFn: () => gamesApi.getTimeSlotStats(filter),
  });
};

// ============================================
// Game Mutations
// ============================================

export const useCreateGameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateGameDto) => gamesApi.createGame(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
      if (variables.clubId) {
        queryClient.invalidateQueries({ queryKey: gameKeys.byClub(variables.clubId) });
      }
      showSuccessToast('게임이 생성되었습니다.');
    },
    meta: { errorMessage: '게임 생성에 실패했습니다.' },
  });
};

export const useUpdateGameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGameDto }) =>
      gamesApi.updateGame(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists() });
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(id) });
      showSuccessToast('게임 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '게임 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteGameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => gamesApi.deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.all });
      showSuccessToast('게임이 삭제되었습니다.');
    },
    meta: { errorMessage: '게임 삭제에 실패했습니다.' },
  });
};

// ============================================
// Weekly Schedule Mutations
// ============================================

export const useCreateWeeklyScheduleMutation = () => {
  return useMutation({
    meta: { globalLoading: false, errorMessage: '주간 스케줄 생성에 실패했습니다.' },
    mutationFn: ({ gameId, data }: { gameId: number; data: CreateGameWeeklyScheduleDto }) =>
      gamesApi.createWeeklySchedule(gameId, data),
    // onSuccess에서 invalidate 하지 않음 - 마법사에서 완료 후 refetch() 호출
  });
};

export const useUpdateWeeklyScheduleMutation = () => {
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
      showSuccessToast('주간 스케줄이 수정되었습니다.');
    },
    meta: { errorMessage: '주간 스케줄 수정에 실패했습니다.' },
  });
};

export const useDeleteWeeklyScheduleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, scheduleId }: { gameId: number; scheduleId: number }) =>
      gamesApi.deleteWeeklySchedule(gameId, scheduleId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.weeklySchedules(gameId) });
      showSuccessToast('주간 스케줄이 삭제되었습니다.');
    },
    meta: { errorMessage: '주간 스케줄 삭제에 실패했습니다.' },
  });
};

// ============================================
// Time Slot Mutations
// ============================================

export const useCreateTimeSlotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: number; data: CreateGameTimeSlotDto }) =>
      gamesApi.createTimeSlot(gameId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
      showSuccessToast('타임슬롯이 생성되었습니다.');
    },
    meta: { errorMessage: '타임슬롯 생성에 실패했습니다.' },
  });
};

export const useBulkCreateTimeSlotsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, timeSlots }: { gameId: number; timeSlots: CreateGameTimeSlotDto[] }) =>
      gamesApi.bulkCreateTimeSlots(gameId, timeSlots),
    onSuccess: (_, { gameId, timeSlots }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
      showSuccessToast(`${timeSlots.length}개의 타임슬롯이 생성되었습니다.`);
    },
    meta: { errorMessage: '타임슬롯 일괄 생성에 실패했습니다.' },
  });
};

export const useGenerateTimeSlotsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { globalLoading: false, errorMessage: '타임슬롯 자동 생성에 실패했습니다.' },
    mutationFn: ({
      gameId,
      startDate,
      endDate,
    }: {
      gameId: number;
      startDate: string;
      endDate: string;
    }) => gamesApi.generateTimeSlots(gameId, startDate, endDate),
    onSuccess: (data, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
      showSuccessToast(`${data?.length || 0}개의 타임슬롯이 자동 생성되었습니다.`);
    },
  });
};

export const useUpdateTimeSlotMutation = () => {
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
      showSuccessToast('타임슬롯이 수정되었습니다.');
    },
    meta: { errorMessage: '타임슬롯 수정에 실패했습니다.' },
  });
};

export const useDeleteTimeSlotMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, timeSlotId }: { gameId: number; timeSlotId: number }) =>
      gamesApi.deleteTimeSlot(gameId, timeSlotId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats() });
      showSuccessToast('타임슬롯이 삭제되었습니다.');
    },
    meta: { errorMessage: '타임슬롯 삭제에 실패했습니다.' },
  });
};
