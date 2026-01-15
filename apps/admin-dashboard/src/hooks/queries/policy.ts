import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cancellationPolicyApi,
  refundPolicyApi,
  noShowPolicyApi,
} from '@/lib/api/policyApi';
import { policyKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type {
  CancellationPolicy,
  RefundPolicy,
  NoShowPolicy,
} from '@/types/settings';

// ============================================
// Cancellation Policy Queries
// ============================================

export const useCancellationPolicyDefaultQuery = (clubId?: number) => {
  return useQuery({
    queryKey: policyKeys.cancellationDefault(clubId),
    queryFn: async () => {
      const response = await cancellationPolicyApi.getDefault(clubId);
      return response.data?.success ? response.data.data : null;
    },
    meta: { globalLoading: false },
  });
};

export const useCancellationPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.cancellationDetail(id),
    queryFn: async () => {
      const response = await cancellationPolicyApi.getById(id);
      return response.data?.success ? response.data.data : null;
    },
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

// ============================================
// Cancellation Policy Mutations
// ============================================

export const useCreateCancellationPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CancellationPolicy, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await cancellationPolicyApi.create(data);
      if (!response.data?.success) {
        throw new Error('정책 생성에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellation() });
      showSuccessToast('취소 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '취소 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateCancellationPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CancellationPolicy> }) => {
      const response = await cancellationPolicyApi.update(id, data);
      if (!response.data?.success) {
        throw new Error('정책 업데이트에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellation() });
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellationDetail(id) });
      showSuccessToast('취소 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '취소 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteCancellationPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await cancellationPolicyApi.delete(id);
      if (!response.data?.success) {
        throw new Error('정책 삭제에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellation() });
      showSuccessToast('취소 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '취소 정책 삭제에 실패했습니다.' },
  });
};

// ============================================
// Refund Policy Queries
// ============================================

export const useRefundPolicyDefaultQuery = (clubId?: number) => {
  return useQuery({
    queryKey: policyKeys.refundDefault(clubId),
    queryFn: async () => {
      const response = await refundPolicyApi.getDefault(clubId);
      return response.data?.success ? response.data.data : null;
    },
    meta: { globalLoading: false },
  });
};

export const useRefundPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.refundDetail(id),
    queryFn: async () => {
      const response = await refundPolicyApi.getById(id);
      return response.data?.success ? response.data.data : null;
    },
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

// ============================================
// Refund Policy Mutations
// ============================================

export const useCreateRefundPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<RefundPolicy, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await refundPolicyApi.create(data as any);
      if (!response.data?.success) {
        throw new Error('정책 생성에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.refund() });
      showSuccessToast('환불 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '환불 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateRefundPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RefundPolicy> }) => {
      const response = await refundPolicyApi.update(id, data as any);
      if (!response.data?.success) {
        throw new Error('정책 업데이트에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.refund() });
      queryClient.invalidateQueries({ queryKey: policyKeys.refundDetail(id) });
      showSuccessToast('환불 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '환불 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteRefundPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await refundPolicyApi.delete(id);
      if (!response.data?.success) {
        throw new Error('정책 삭제에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.refund() });
      showSuccessToast('환불 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '환불 정책 삭제에 실패했습니다.' },
  });
};

// ============================================
// NoShow Policy Queries
// ============================================

export const useNoShowPolicyDefaultQuery = (clubId?: number) => {
  return useQuery({
    queryKey: policyKeys.noShowDefault(clubId),
    queryFn: async () => {
      const response = await noShowPolicyApi.getDefault(clubId);
      return response.data?.success ? response.data.data : null;
    },
    meta: { globalLoading: false },
  });
};

export const useNoShowPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.noShowDetail(id),
    queryFn: async () => {
      const response = await noShowPolicyApi.getById(id);
      return response.data?.success ? response.data.data : null;
    },
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

// ============================================
// NoShow Policy Mutations
// ============================================

export const useCreateNoShowPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<NoShowPolicy, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await noShowPolicyApi.create(data as any);
      if (!response.data?.success) {
        throw new Error('정책 생성에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow() });
      showSuccessToast('노쇼 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateNoShowPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NoShowPolicy> }) => {
      const response = await noShowPolicyApi.update(id, data as any);
      if (!response.data?.success) {
        throw new Error('정책 업데이트에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow() });
      queryClient.invalidateQueries({ queryKey: policyKeys.noShowDetail(id) });
      showSuccessToast('노쇼 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteNoShowPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await noShowPolicyApi.delete(id);
      if (!response.data?.success) {
        throw new Error('정책 삭제에 실패했습니다.');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow() });
      showSuccessToast('노쇼 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 삭제에 실패했습니다.' },
  });
};
