/**
 * Policy API - 정책 관리 API (취소/환불/노쇼)
 */

import { apiClient } from './client';
import { extractSingle, extractList } from './bffParser';
import type {
  CancellationPolicy,
  RefundPolicy,
  NoShowPolicy,
} from '@/types/settings';

// =====================================================
// Cancellation Policy API
// =====================================================

export const cancellationPolicyApi = {
  async getAll(clubId?: number): Promise<CancellationPolicy[]> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>('/admin/policies/cancellation', params);
    return extractList<CancellationPolicy>(response.data);
  },

  async getById(id: number): Promise<CancellationPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/cancellation/${id}`);
    return extractSingle<CancellationPolicy>(response.data);
  },

  async getDefault(clubId?: number): Promise<CancellationPolicy | null> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>('/admin/policies/cancellation/default', params);
    return extractSingle<CancellationPolicy>(response.data);
  },

  async create(data: Omit<CancellationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<CancellationPolicy> {
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
  async getAll(clubId?: number): Promise<RefundPolicy[]> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>('/admin/policies/refund', params);
    return extractList<RefundPolicy>(response.data);
  },

  async getById(id: number): Promise<RefundPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/refund/${id}`);
    return extractSingle<RefundPolicy>(response.data);
  },

  async getDefault(clubId?: number): Promise<RefundPolicy | null> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>('/admin/policies/refund/default', params);
    return extractSingle<RefundPolicy>(response.data);
  },

  async create(data: Omit<RefundPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<RefundPolicy> {
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
  async getAll(clubId?: number): Promise<NoShowPolicy[]> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>('/admin/policies/noshow', params);
    return extractList<NoShowPolicy>(response.data);
  },

  async getById(id: number): Promise<NoShowPolicy | null> {
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/${id}`);
    return extractSingle<NoShowPolicy>(response.data);
  },

  async getDefault(clubId?: number): Promise<NoShowPolicy | null> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>('/admin/policies/noshow/default', params);
    return extractSingle<NoShowPolicy>(response.data);
  },

  async create(data: Omit<NoShowPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<NoShowPolicy> {
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
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/user/${userId}/count`, params);
    const result = extractSingle<{ userId: number; noShowCount: number }>(response.data);
    if (!result) throw new Error('노쇼 횟수 조회에 실패했습니다.');
    return result;
  },

  async getApplicablePenalty(userId: number, clubId?: number): Promise<unknown> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    const response = await apiClient.get<unknown>(`/admin/policies/noshow/user/${userId}/penalty`, params);
    return extractSingle<unknown>(response.data);
  },
};

// =====================================================
// Combined Policy API Export
// =====================================================

export const policyApi = {
  cancellation: cancellationPolicyApi,
  refund: refundPolicyApi,
  noShow: noShowPolicyApi,
};
