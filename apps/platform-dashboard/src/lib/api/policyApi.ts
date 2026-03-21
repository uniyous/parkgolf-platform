/**
 * Policy API - 정책 관리 API (취소/환불/노쇼/운영)
 * platform-dashboard는 항상 PLATFORM 스코프로 동작
 */

import { apiClient } from './client';
import { extractSingle, extractList } from './bffParser';
import type {
  CancellationPolicy,
  RefundPolicy,
  NoShowPolicy,
  OperatingPolicy,
} from '@/types/settings';

// =====================================================
// Cancellation Policy API
// =====================================================

export const cancellationPolicyApi = {
  async getAll(): Promise<CancellationPolicy[]> {
    const response = await apiClient.get<unknown>('/admin/policies/cancellation', {});
    return extractList<CancellationPolicy>(response.data);
  },

  async resolve(): Promise<CancellationPolicy | null> {
    const response = await apiClient.get<unknown>('/admin/policies/cancellation/resolve', {});
    return extractSingle<CancellationPolicy>(response.data);
  },

  async getById(id: number): Promise<CancellationPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/cancellation/${id}`);
    return extractSingle<CancellationPolicy>(response.data);
  },

  async create(data: Partial<CancellationPolicy>): Promise<CancellationPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/cancellation', {
      ...data,
      scopeLevel: 'PLATFORM',
    });
    const result = extractSingle<CancellationPolicy>(response.data);
    if (!result) throw new Error('취소 정책 생성에 실패했습니다.');
    return result;
  },

  async update(id: number, data: Partial<CancellationPolicy>): Promise<CancellationPolicy> {
    const response = await apiClient.put<unknown>(`/admin/policies/cancellation/${id}`, data);
    const result = extractSingle<CancellationPolicy>(response.data);
    if (!result) throw new Error('취소 정책 수정에 실패했습니다.');
    return result;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/policies/cancellation/${id}`);
  },
};

// =====================================================
// Refund Policy API
// =====================================================

export const refundPolicyApi = {
  async getAll(): Promise<RefundPolicy[]> {
    const response = await apiClient.get<unknown>('/admin/policies/refund', {});
    return extractList<RefundPolicy>(response.data);
  },

  async resolve(): Promise<RefundPolicy | null> {
    const response = await apiClient.get<unknown>('/admin/policies/refund/resolve', {});
    return extractSingle<RefundPolicy>(response.data);
  },

  async getById(id: number): Promise<RefundPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/refund/${id}`);
    return extractSingle<RefundPolicy>(response.data);
  },

  async create(data: Partial<RefundPolicy>): Promise<RefundPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/refund', {
      ...data,
      scopeLevel: 'PLATFORM',
    });
    const result = extractSingle<RefundPolicy>(response.data);
    if (!result) throw new Error('환불 정책 생성에 실패했습니다.');
    return result;
  },

  async update(id: number, data: Partial<RefundPolicy>): Promise<RefundPolicy> {
    const response = await apiClient.put<unknown>(`/admin/policies/refund/${id}`, data);
    const result = extractSingle<RefundPolicy>(response.data);
    if (!result) throw new Error('환불 정책 수정에 실패했습니다.');
    return result;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/policies/refund/${id}`);
  },

  async calculate(
    policyId: number,
    originalAmount: number,
    hoursBeforeBooking: number,
  ): Promise<{ refundRate: number; refundAmount: number; fee: number }> {
    const response = await apiClient.post<unknown>('/admin/policies/refund/calculate', {
      policyId,
      originalAmount,
      hoursBeforeBooking,
    });
    const result = extractSingle<{ refundRate: number; refundAmount: number; fee: number }>(response.data);
    if (!result) throw new Error('환불 계산에 실패했습니다.');
    return result;
  },
};

// =====================================================
// No-Show Policy API
// =====================================================

export const noShowPolicyApi = {
  async getAll(): Promise<NoShowPolicy[]> {
    const response = await apiClient.get<unknown>('/admin/policies/noshow', {});
    return extractList<NoShowPolicy>(response.data);
  },

  async resolve(): Promise<NoShowPolicy | null> {
    const response = await apiClient.get<unknown>('/admin/policies/noshow/resolve', {});
    return extractSingle<NoShowPolicy>(response.data);
  },

  async getById(id: number): Promise<NoShowPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/${id}`);
    return extractSingle<NoShowPolicy>(response.data);
  },

  async create(data: Partial<NoShowPolicy>): Promise<NoShowPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/noshow', {
      ...data,
      scopeLevel: 'PLATFORM',
    });
    const result = extractSingle<NoShowPolicy>(response.data);
    if (!result) throw new Error('노쇼 정책 생성에 실패했습니다.');
    return result;
  },

  async update(id: number, data: Partial<NoShowPolicy>): Promise<NoShowPolicy> {
    const response = await apiClient.put<unknown>(`/admin/policies/noshow/${id}`, data);
    const result = extractSingle<NoShowPolicy>(response.data);
    if (!result) throw new Error('노쇼 정책 수정에 실패했습니다.');
    return result;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/policies/noshow/${id}`);
  },

  async getUserNoShowCount(userId: number): Promise<{ userId: number; noShowCount: number }> {
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/user/${userId}/count`);
    const result = extractSingle<{ userId: number; noShowCount: number }>(response.data);
    if (!result) throw new Error('노쇼 횟수 조회에 실패했습니다.');
    return result;
  },

  async getApplicablePenalty(userId: number): Promise<unknown> {
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/user/${userId}/penalty`);
    return extractSingle<unknown>(response.data);
  },
};

// =====================================================
// Operating Policy API
// =====================================================

export const operatingPolicyApi = {
  async getAll(): Promise<OperatingPolicy[]> {
    const response = await apiClient.get<unknown>('/admin/policies/operating', {});
    return extractList<OperatingPolicy>(response.data);
  },

  async resolve(): Promise<OperatingPolicy | null> {
    const response = await apiClient.get<unknown>('/admin/policies/operating/resolve', {});
    return extractSingle<OperatingPolicy>(response.data);
  },

  async getById(id: number): Promise<OperatingPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/operating/${id}`);
    return extractSingle<OperatingPolicy>(response.data);
  },

  async create(data: Partial<OperatingPolicy>): Promise<OperatingPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/operating', {
      ...data,
      scopeLevel: 'PLATFORM',
    });
    const result = extractSingle<OperatingPolicy>(response.data);
    if (!result) throw new Error('운영 정책 생성에 실패했습니다.');
    return result;
  },

  async update(id: number, data: Partial<OperatingPolicy>): Promise<OperatingPolicy> {
    const response = await apiClient.put<unknown>(`/admin/policies/operating/${id}`, data);
    const result = extractSingle<OperatingPolicy>(response.data);
    if (!result) throw new Error('운영 정책 수정에 실패했습니다.');
    return result;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/policies/operating/${id}`);
  },
};

// =====================================================
// Combined Policy API Export
// =====================================================

export const policyApi = {
  cancellation: cancellationPolicyApi,
  refund: refundPolicyApi,
  noShow: noShowPolicyApi,
  operating: operatingPolicyApi,
};
