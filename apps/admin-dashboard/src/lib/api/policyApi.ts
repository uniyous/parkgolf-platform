/**
 * Policy API - 정책 관리 API (취소/환불/노쇼/운영)
 */

import { apiClient } from './client';
import { extractSingle, extractList } from './bffParser';
import type {
  PolicyScope,
  CancellationPolicy,
  ResolvedCancellationPolicy,
  RefundPolicy,
  ResolvedRefundPolicy,
  NoShowPolicy,
  ResolvedNoShowPolicy,
  OperatingPolicy,
  ResolvedOperatingPolicy,
} from '@/types/settings';

// =====================================================
// Filter types
// =====================================================

interface PolicyFilter {
  scopeLevel?: PolicyScope;
  companyId?: number;
  clubId?: number;
  isActive?: boolean;
  isDefault?: boolean;
}

interface PolicyResolveQuery {
  companyId?: number;
  clubId?: number;
}

// =====================================================
// Cancellation Policy API
// =====================================================

export const cancellationPolicyApi = {
  async getAll(filter?: PolicyFilter): Promise<CancellationPolicy[]> {
    const params: Record<string, unknown> = {};
    if (filter?.scopeLevel) params.scopeLevel = filter.scopeLevel;
    if (filter?.companyId) params.companyId = filter.companyId;
    if (filter?.clubId) params.clubId = filter.clubId;
    if (filter?.isActive !== undefined) params.isActive = filter.isActive;
    const response = await apiClient.get<unknown>('/admin/policies/cancellation', params);
    return extractList<CancellationPolicy>(response.data);
  },

  async getById(id: number): Promise<CancellationPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/cancellation/${id}`);
    return extractSingle<CancellationPolicy>(response.data);
  },

  async resolve(query?: PolicyResolveQuery): Promise<ResolvedCancellationPolicy | null> {
    const params: Record<string, unknown> = {};
    if (query?.companyId) params.companyId = query.companyId;
    if (query?.clubId) params.clubId = query.clubId;
    const response = await apiClient.get<unknown>('/admin/policies/cancellation/resolve', params);
    return extractSingle<ResolvedCancellationPolicy>(response.data);
  },

  async create(data: Partial<CancellationPolicy>): Promise<CancellationPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/cancellation', data);
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
  async getAll(filter?: PolicyFilter): Promise<RefundPolicy[]> {
    const params: Record<string, unknown> = {};
    if (filter?.scopeLevel) params.scopeLevel = filter.scopeLevel;
    if (filter?.companyId) params.companyId = filter.companyId;
    if (filter?.clubId) params.clubId = filter.clubId;
    if (filter?.isActive !== undefined) params.isActive = filter.isActive;
    const response = await apiClient.get<unknown>('/admin/policies/refund', params);
    return extractList<RefundPolicy>(response.data);
  },

  async getById(id: number): Promise<RefundPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/refund/${id}`);
    return extractSingle<RefundPolicy>(response.data);
  },

  async resolve(query?: PolicyResolveQuery): Promise<ResolvedRefundPolicy | null> {
    const params: Record<string, unknown> = {};
    if (query?.companyId) params.companyId = query.companyId;
    if (query?.clubId) params.clubId = query.clubId;
    const response = await apiClient.get<unknown>('/admin/policies/refund/resolve', params);
    return extractSingle<ResolvedRefundPolicy>(response.data);
  },

  async create(data: Partial<RefundPolicy>): Promise<RefundPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/refund', data);
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
  async getAll(filter?: PolicyFilter): Promise<NoShowPolicy[]> {
    const params: Record<string, unknown> = {};
    if (filter?.scopeLevel) params.scopeLevel = filter.scopeLevel;
    if (filter?.companyId) params.companyId = filter.companyId;
    if (filter?.clubId) params.clubId = filter.clubId;
    if (filter?.isActive !== undefined) params.isActive = filter.isActive;
    const response = await apiClient.get<unknown>('/admin/policies/noshow', params);
    return extractList<NoShowPolicy>(response.data);
  },

  async getById(id: number): Promise<NoShowPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/${id}`);
    return extractSingle<NoShowPolicy>(response.data);
  },

  async resolve(query?: PolicyResolveQuery): Promise<ResolvedNoShowPolicy | null> {
    const params: Record<string, unknown> = {};
    if (query?.companyId) params.companyId = query.companyId;
    if (query?.clubId) params.clubId = query.clubId;
    const response = await apiClient.get<unknown>('/admin/policies/noshow/resolve', params);
    return extractSingle<ResolvedNoShowPolicy>(response.data);
  },

  async create(data: Partial<NoShowPolicy>): Promise<NoShowPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/noshow', data);
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

  async getUserNoShowCount(userId: number, clubId?: number): Promise<{ userId: number; noShowCount: number }> {
    const params: Record<string, unknown> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/user/${userId}/count`, params);
    const result = extractSingle<{ userId: number; noShowCount: number }>(response.data);
    if (!result) throw new Error('노쇼 횟수 조회에 실패했습니다.');
    return result;
  },

  async getApplicablePenalty(userId: number, clubId?: number): Promise<unknown> {
    const params: Record<string, unknown> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/user/${userId}/penalty`, params);
    return extractSingle<unknown>(response.data);
  },
};

// =====================================================
// Operating Policy API
// =====================================================

export const operatingPolicyApi = {
  async getAll(filter?: PolicyFilter): Promise<OperatingPolicy[]> {
    const params: Record<string, unknown> = {};
    if (filter?.scopeLevel) params.scopeLevel = filter.scopeLevel;
    if (filter?.companyId) params.companyId = filter.companyId;
    if (filter?.clubId) params.clubId = filter.clubId;
    if (filter?.isActive !== undefined) params.isActive = filter.isActive;
    const response = await apiClient.get<unknown>('/admin/policies/operating', params);
    return extractList<OperatingPolicy>(response.data);
  },

  async getById(id: number): Promise<OperatingPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/operating/${id}`);
    return extractSingle<OperatingPolicy>(response.data);
  },

  async resolve(query?: PolicyResolveQuery): Promise<ResolvedOperatingPolicy | null> {
    const params: Record<string, unknown> = {};
    if (query?.companyId) params.companyId = query.companyId;
    if (query?.clubId) params.clubId = query.clubId;
    const response = await apiClient.get<unknown>('/admin/policies/operating/resolve', params);
    return extractSingle<ResolvedOperatingPolicy>(response.data);
  },

  async create(data: Partial<OperatingPolicy>): Promise<OperatingPolicy> {
    const response = await apiClient.post<unknown>('/admin/policies/operating', data);
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
