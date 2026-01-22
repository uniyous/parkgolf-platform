/**
 * Policy API - 정책 관리 API (취소/환불/노쇼)
 */

import { apiClient, type ClientResponse } from './client';
import type {
  CancellationPolicy,
  RefundPolicy,
  NoShowPolicy,
} from '@/types/settings';

// =====================================================
// API Response Types
// =====================================================

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

// =====================================================
// Cancellation Policy API
// =====================================================

export const cancellationPolicyApi = {
  async getAll(clubId?: number): Promise<ClientResponse<ApiSuccessResponse<CancellationPolicy[]>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get('/admin/policies/cancellation', params);
  },

  async getById(id: number): Promise<ClientResponse<ApiSuccessResponse<CancellationPolicy>>> {
    return apiClient.get(`/admin/policies/cancellation/${id}`);
  },

  async getDefault(clubId?: number): Promise<ClientResponse<ApiSuccessResponse<CancellationPolicy | null>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get('/admin/policies/cancellation/default', params);
  },

  async create(data: Omit<CancellationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientResponse<ApiSuccessResponse<CancellationPolicy>>> {
    return apiClient.post('/admin/policies/cancellation', data);
  },

  async update(id: number, data: Partial<CancellationPolicy>): Promise<ClientResponse<ApiSuccessResponse<CancellationPolicy>>> {
    return apiClient.put(`/admin/policies/cancellation/${id}`, data);
  },

  async delete(id: number): Promise<ClientResponse<ApiSuccessResponse<CancellationPolicy>>> {
    return apiClient.delete(`/admin/policies/cancellation/${id}`);
  },
};

// =====================================================
// Refund Policy API
// =====================================================

export const refundPolicyApi = {
  async getAll(clubId?: number): Promise<ClientResponse<ApiSuccessResponse<RefundPolicy[]>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get('/admin/policies/refund', params);
  },

  async getById(id: number): Promise<ClientResponse<ApiSuccessResponse<RefundPolicy>>> {
    return apiClient.get(`/admin/policies/refund/${id}`);
  },

  async getDefault(clubId?: number): Promise<ClientResponse<ApiSuccessResponse<RefundPolicy | null>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get('/admin/policies/refund/default', params);
  },

  async create(data: Omit<RefundPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientResponse<ApiSuccessResponse<RefundPolicy>>> {
    return apiClient.post('/admin/policies/refund', data);
  },

  async update(id: number, data: Partial<RefundPolicy>): Promise<ClientResponse<ApiSuccessResponse<RefundPolicy>>> {
    return apiClient.put(`/admin/policies/refund/${id}`, data);
  },

  async delete(id: number): Promise<ClientResponse<ApiSuccessResponse<RefundPolicy>>> {
    return apiClient.delete(`/admin/policies/refund/${id}`);
  },

  async calculate(
    policyId: number,
    originalAmount: number,
    hoursBeforeBooking: number,
  ): Promise<ClientResponse<ApiSuccessResponse<{ refundRate: number; refundAmount: number; fee: number }>>> {
    return apiClient.post('/admin/policies/refund/calculate', {
      policyId,
      originalAmount,
      hoursBeforeBooking,
    });
  },
};

// =====================================================
// No-Show Policy API
// =====================================================

export const noShowPolicyApi = {
  async getAll(clubId?: number): Promise<ClientResponse<ApiSuccessResponse<NoShowPolicy[]>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get('/admin/policies/noshow', params);
  },

  async getById(id: number): Promise<ClientResponse<ApiSuccessResponse<NoShowPolicy>>> {
    return apiClient.get(`/admin/policies/noshow/${id}`);
  },

  async getDefault(clubId?: number): Promise<ClientResponse<ApiSuccessResponse<NoShowPolicy | null>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get('/admin/policies/noshow/default', params);
  },

  async create(data: Omit<NoShowPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientResponse<ApiSuccessResponse<NoShowPolicy>>> {
    return apiClient.post('/admin/policies/noshow', data);
  },

  async update(id: number, data: Partial<NoShowPolicy>): Promise<ClientResponse<ApiSuccessResponse<NoShowPolicy>>> {
    return apiClient.put(`/admin/policies/noshow/${id}`, data);
  },

  async delete(id: number): Promise<ClientResponse<ApiSuccessResponse<NoShowPolicy>>> {
    return apiClient.delete(`/admin/policies/noshow/${id}`);
  },

  async getUserNoShowCount(userId: number, clubId?: number): Promise<ClientResponse<ApiSuccessResponse<{ userId: number; noShowCount: number }>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get(`/admin/policies/noshow/user/${userId}/count`, params);
  },

  async getApplicablePenalty(userId: number, clubId?: number): Promise<ClientResponse<ApiSuccessResponse<any>>> {
    const params: Record<string, any> = {};
    if (clubId !== undefined) params.clubId = clubId;
    return apiClient.get(`/admin/policies/noshow/user/${userId}/penalty`, params);
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
