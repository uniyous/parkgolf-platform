import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type UpdateNotificationSettings } from '@/lib/api/settingsApi';

const settingsKeys = {
  all: ['settings'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
};

export const useNotificationSettingsQuery = () => {
  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: () => settingsApi.getNotificationSettings(),
  });
};

export const useUpdateNotificationSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateNotificationSettings) =>
      settingsApi.updateNotificationSettings(settings),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.notifications(), data);
    },
  });
};
