import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cancellationPolicyApi,
  refundPolicyApi,
  noShowPolicyApi,
  operatingPolicyApi,
} from '@/lib/api/policyApi';
import { policyKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import type {
  CancellationPolicy,
  RefundPolicy,
  NoShowPolicy,
  OperatingPolicy,
} from '@/types/settings';

// ============================================
// Cancellation Policy Queries
// ============================================

export const useCancellationPolicyResolveQuery = () => {
  return useQuery({
    queryKey: policyKeys.cancellationResolve(),
    queryFn: () => cancellationPolicyApi.resolve(),
    meta: { globalLoading: false },
  });
};

export const useCancellationPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.cancellationDetail(id),
    queryFn: () => cancellationPolicyApi.getById(id),
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
    mutationFn: (data: Partial<CancellationPolicy>) =>
      cancellationPolicyApi.create(data),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<CancellationPolicy> }) =>
      cancellationPolicyApi.update(id, data),
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
    mutationFn: (id: number) => cancellationPolicyApi.delete(id),
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

export const useRefundPolicyResolveQuery = () => {
  return useQuery({
    queryKey: policyKeys.refundResolve(),
    queryFn: () => refundPolicyApi.resolve(),
    meta: { globalLoading: false },
  });
};

export const useRefundPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.refundDetail(id),
    queryFn: () => refundPolicyApi.getById(id),
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
    mutationFn: (data: Partial<RefundPolicy>) =>
      refundPolicyApi.create(data),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<RefundPolicy> }) =>
      refundPolicyApi.update(id, data),
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
    mutationFn: (id: number) => refundPolicyApi.delete(id),
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

export const useNoShowPolicyResolveQuery = () => {
  return useQuery({
    queryKey: policyKeys.noShowResolve(),
    queryFn: () => noShowPolicyApi.resolve(),
    meta: { globalLoading: false },
  });
};

export const useNoShowPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.noShowDetail(id),
    queryFn: () => noShowPolicyApi.getById(id),
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
    mutationFn: (data: Partial<NoShowPolicy>) =>
      noShowPolicyApi.create(data),
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
    mutationFn: ({ id, data }: { id: number; data: Partial<NoShowPolicy> }) =>
      noShowPolicyApi.update(id, data),
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
    mutationFn: (id: number) => noShowPolicyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow() });
      showSuccessToast('노쇼 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 삭제에 실패했습니다.' },
  });
};

// ============================================
// Operating Policy Queries
// ============================================

export const useOperatingPolicyResolveQuery = () => {
  return useQuery({
    queryKey: policyKeys.operatingResolve(),
    queryFn: () => operatingPolicyApi.resolve(),
    meta: { globalLoading: false },
  });
};

export const useOperatingPolicyQuery = (id: number) => {
  return useQuery({
    queryKey: policyKeys.operatingDetail(id),
    queryFn: () => operatingPolicyApi.getById(id),
    enabled: !!id,
    meta: { globalLoading: false },
  });
};

// ============================================
// Operating Policy Mutations
// ============================================

export const useCreateOperatingPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<OperatingPolicy>) =>
      operatingPolicyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.operating() });
      showSuccessToast('운영 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '운영 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateOperatingPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OperatingPolicy> }) =>
      operatingPolicyApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.operating() });
      queryClient.invalidateQueries({ queryKey: policyKeys.operatingDetail(id) });
      showSuccessToast('운영 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '운영 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteOperatingPolicyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => operatingPolicyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.operating() });
      showSuccessToast('운영 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '운영 정책 삭제에 실패했습니다.' },
  });
};
