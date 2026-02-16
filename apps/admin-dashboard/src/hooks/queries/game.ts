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
import { useActiveCompanyId } from '@/hooks/useActiveCompany';

// ============================================
// Game Queries
// ============================================

export const useGamesQuery = (filters?: GameFilter) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: gameKeys.list(companyId, filters),
    queryFn: () => gamesApi.getGames(filters),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    meta: { globalLoading: false },
  });
};

export const useGameQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: gameKeys.detail(companyId, id),
    queryFn: () => gamesApi.getGameById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    meta: { globalLoading: false },
  });
};

export const useGamesByClubQuery = (clubId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: gameKeys.byClub(companyId, clubId),
    queryFn: () => gamesApi.getGamesByClub(clubId),
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    meta: { globalLoading: false },
  });
};

// ============================================
// Weekly Schedule Queries
// ============================================

export const useGameWeeklySchedulesQuery = (gameId: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: gameKeys.weeklySchedules(companyId, gameId),
    queryFn: () => gamesApi.getWeeklySchedules(gameId),
    enabled: !!gameId,
    meta: { globalLoading: false },
  });
};

// ============================================
// Time Slot Queries
// ============================================

export const useGameTimeSlotsQuery = (gameId: number, filter?: GameTimeSlotFilter) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: gameKeys.timeSlots(companyId, gameId, filter),
    queryFn: () => gamesApi.getTimeSlots(gameId, filter),
    enabled: !!gameId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    meta: { globalLoading: false },
  });
};

export const useGameTimeSlotStatsQuery = (filter?: GameTimeSlotFilter) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: gameKeys.timeSlotStats(companyId, filter),
    queryFn: () => gamesApi.getTimeSlotStats(filter),
    meta: { globalLoading: false },
  });
};

// ============================================
// Game Mutations
// ============================================

export const useCreateGameMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: CreateGameDto) => gamesApi.createGame(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists(companyId) });
      if (variables.clubId) {
        queryClient.invalidateQueries({ queryKey: gameKeys.byClub(companyId, variables.clubId) });
      }
      showSuccessToast('게임이 생성되었습니다.');
    },
    meta: { errorMessage: '게임 생성에 실패했습니다.' },
  });
};

export const useUpdateGameMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGameDto }) =>
      gamesApi.updateGame(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.lists(companyId) });
      queryClient.invalidateQueries({ queryKey: gameKeys.detail(companyId, id) });
      showSuccessToast('게임 정보가 수정되었습니다.');
    },
    meta: { errorMessage: '게임 정보 수정에 실패했습니다.' },
  });
};

export const useDeleteGameMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => gamesApi.deleteGame(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gameKeys.all(companyId) });
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
  });
};

export const useUpdateWeeklyScheduleMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

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
      queryClient.invalidateQueries({ queryKey: gameKeys.weeklySchedules(companyId, gameId) });
      showSuccessToast('주간 스케줄이 수정되었습니다.');
    },
    meta: { errorMessage: '주간 스케줄 수정에 실패했습니다.' },
  });
};

export const useDeleteWeeklyScheduleMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ gameId, scheduleId }: { gameId: number; scheduleId: number }) =>
      gamesApi.deleteWeeklySchedule(gameId, scheduleId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.weeklySchedules(companyId, gameId) });
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ gameId, data }: { gameId: number; data: CreateGameTimeSlotDto }) =>
      gamesApi.createTimeSlot(gameId, data),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(companyId, gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats(companyId) });
      showSuccessToast('타임슬롯이 생성되었습니다.');
    },
    meta: { errorMessage: '타임슬롯 생성에 실패했습니다.' },
  });
};

export const useBulkCreateTimeSlotsMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ gameId, timeSlots }: { gameId: number; timeSlots: CreateGameTimeSlotDto[] }) =>
      gamesApi.bulkCreateTimeSlots(gameId, timeSlots),
    onSuccess: (_, { gameId, timeSlots }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(companyId, gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats(companyId) });
      showSuccessToast(`${timeSlots.length}개의 타임슬롯이 생성되었습니다.`);
    },
    meta: { errorMessage: '타임슬롯 일괄 생성에 실패했습니다.' },
  });
};

export const useGenerateTimeSlotsMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

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
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(companyId, gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats(companyId) });
      showSuccessToast(`${data?.length || 0}개의 타임슬롯이 자동 생성되었습니다.`);
    },
  });
};

export const useUpdateTimeSlotMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

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
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(companyId, gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats(companyId) });
      showSuccessToast('타임슬롯이 수정되었습니다.');
    },
    meta: { errorMessage: '타임슬롯 수정에 실패했습니다.' },
  });
};

export const useDeleteTimeSlotMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ gameId, timeSlotId }: { gameId: number; timeSlotId: number }) =>
      gamesApi.deleteTimeSlot(gameId, timeSlotId),
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlots(companyId, gameId, undefined) });
      queryClient.invalidateQueries({ queryKey: gameKeys.timeSlotStats(companyId) });
      showSuccessToast('타임슬롯이 삭제되었습니다.');
    },
    meta: { errorMessage: '타임슬롯 삭제에 실패했습니다.' },
  });
};
