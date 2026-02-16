import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cancellationPolicyApi,
  refundPolicyApi,
  noShowPolicyApi,
  operatingPolicyApi,
} from '@/lib/api/policyApi';
import { policyKeys } from './keys';
import { showSuccessToast } from '@/lib/errors';
import { useActiveCompanyId } from '@/hooks/useActiveCompany';
import type {
  CancellationPolicy,
  RefundPolicy,
  NoShowPolicy,
  OperatingPolicy,
} from '@/types/settings';

// ============================================
// Cancellation Policy Queries
// ============================================

export const useCancellationPolicyResolveQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.cancellationResolve(companyId, clubId),
    queryFn: () => cancellationPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useCancellationPolicyDefaultQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.cancellationDefault(companyId, clubId),
    queryFn: () => cancellationPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useCancellationPolicyQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.cancellationDetail(companyId, id),
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: Partial<CancellationPolicy>) =>
      cancellationPolicyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellation(companyId) });
      showSuccessToast('취소 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '취소 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateCancellationPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CancellationPolicy> }) =>
      cancellationPolicyApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellation(companyId) });
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellationDetail(companyId, id) });
      showSuccessToast('취소 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '취소 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteCancellationPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => cancellationPolicyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.cancellation(companyId) });
      showSuccessToast('취소 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '취소 정책 삭제에 실패했습니다.' },
  });
};

// ============================================
// Refund Policy Queries
// ============================================

export const useRefundPolicyResolveQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.refundResolve(companyId, clubId),
    queryFn: () => refundPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useRefundPolicyDefaultQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.refundDefault(companyId, clubId),
    queryFn: () => refundPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useRefundPolicyQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.refundDetail(companyId, id),
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: Partial<RefundPolicy>) =>
      refundPolicyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.refund(companyId) });
      showSuccessToast('환불 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '환불 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateRefundPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RefundPolicy> }) =>
      refundPolicyApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.refund(companyId) });
      queryClient.invalidateQueries({ queryKey: policyKeys.refundDetail(companyId, id) });
      showSuccessToast('환불 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '환불 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteRefundPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => refundPolicyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.refund(companyId) });
      showSuccessToast('환불 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '환불 정책 삭제에 실패했습니다.' },
  });
};

// ============================================
// NoShow Policy Queries
// ============================================

export const useNoShowPolicyResolveQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.noShowResolve(companyId, clubId),
    queryFn: () => noShowPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useNoShowPolicyDefaultQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.noShowDefault(companyId, clubId),
    queryFn: () => noShowPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useNoShowPolicyQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.noShowDetail(companyId, id),
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: Partial<NoShowPolicy>) =>
      noShowPolicyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow(companyId) });
      showSuccessToast('노쇼 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateNoShowPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NoShowPolicy> }) =>
      noShowPolicyApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow(companyId) });
      queryClient.invalidateQueries({ queryKey: policyKeys.noShowDetail(companyId, id) });
      showSuccessToast('노쇼 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteNoShowPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => noShowPolicyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.noShow(companyId) });
      showSuccessToast('노쇼 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '노쇼 정책 삭제에 실패했습니다.' },
  });
};

// ============================================
// Operating Policy Queries
// ============================================

export const useOperatingPolicyResolveQuery = (clubId?: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.operatingResolve(companyId, clubId),
    queryFn: () => operatingPolicyApi.resolve({ companyId: companyId ?? undefined, clubId }),
    meta: { globalLoading: false },
  });
};

export const useOperatingPolicyQuery = (id: number) => {
  const companyId = useActiveCompanyId();
  return useQuery({
    queryKey: policyKeys.operatingDetail(companyId, id),
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
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (data: Partial<OperatingPolicy>) =>
      operatingPolicyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.operating(companyId) });
      showSuccessToast('운영 정책이 생성되었습니다.');
    },
    meta: { errorMessage: '운영 정책 생성에 실패했습니다.' },
  });
};

export const useUpdateOperatingPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<OperatingPolicy> }) =>
      operatingPolicyApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.operating(companyId) });
      queryClient.invalidateQueries({ queryKey: policyKeys.operatingDetail(companyId, id) });
      showSuccessToast('운영 정책이 저장되었습니다.');
    },
    meta: { errorMessage: '운영 정책 저장에 실패했습니다.' },
  });
};

export const useDeleteOperatingPolicyMutation = () => {
  const queryClient = useQueryClient();
  const companyId = useActiveCompanyId();

  return useMutation({
    mutationFn: (id: number) => operatingPolicyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.operating(companyId) });
      showSuccessToast('운영 정책이 삭제되었습니다.');
    },
    meta: { errorMessage: '운영 정책 삭제에 실패했습니다.' },
  });
};
