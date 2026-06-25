import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationApi,
  type NotificationFilters,
  type CreateNotificationDto,
  type CreateTemplateDto,
  type UpdateTemplateDto,
} from '@/lib/api/notificationApi';
import { notificationKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';

// ============================================
// Notification Queries
// ============================================

export const useNotificationsQuery = (filters?: NotificationFilters, page = 1, limit = 20) => {
  return useQuery({
    queryKey: notificationKeys.list({ ...filters, page, limit } as Record<string, unknown>),
    queryFn: () => notificationApi.getNotifications(filters || {}, page, limit),
    meta: { globalLoading: false },
  });
};

export const useNotificationDetailQuery = (id: string) => {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: () => notificationApi.getNotificationById(id),
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

export const useNotificationStatsQuery = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: notificationKeys.stats(dateRange),
    queryFn: () => notificationApi.getNotificationStats(dateRange),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
    meta: { globalLoading: false },
  });
};

// ============================================
// Template Queries
// ============================================

export const useTemplatesQuery = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: notificationKeys.templateList({ page, limit }),
    queryFn: () => notificationApi.getTemplates(page, limit),
    meta: { globalLoading: false },
  });
};

export const useTemplateDetailQuery = (id: string) => {
  return useQuery({
    queryKey: notificationKeys.templateDetail(id),
    queryFn: () => notificationApi.getTemplateById(id),
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

// ============================================
// Mutations
// ============================================

export const useCreateNotificationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotificationDto) => notificationApi.createNotification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      showSuccessToast('알림이 발송되었습니다.');
    },
    meta: { errorMessage: '알림 발송에 실패했습니다.' },
  });
};

export const useCreateTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateDto) => notificationApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
      showSuccessToast('템플릿이 생성되었습니다.');
    },
    meta: { errorMessage: '템플릿 생성에 실패했습니다.' },
  });
};

export const useUpdateTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateDto }) =>
      notificationApi.updateTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.templateDetail(id) });
      showSuccessToast('템플릿이 수정되었습니다.');
    },
    meta: { errorMessage: '템플릿 수정에 실패했습니다.' },
  });
};

export const useDeleteTemplateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.templates() });
      showSuccessToast('템플릿이 삭제되었습니다.');
    },
    meta: { errorMessage: '템플릿 삭제에 실패했습니다.' },
  });
};

export const useTestTemplateMutation = () => {
  return useMutation({
    mutationFn: ({ id, testData }: { id: string; testData: Record<string, unknown> }) =>
      notificationApi.testTemplate(id, testData),
    onSuccess: () => {
      showSuccessToast('테스트 발송이 완료되었습니다.');
    },
    meta: { errorMessage: '테스트 발송에 실패했습니다.' },
  });
};
