import { apiClient } from './client';
import { extractList, extractPagination, extractSingle } from './bffParser';
import type {
  PartnerConfig,
  CreatePartnerConfigDto,
  UpdatePartnerConfigDto,
  PartnerConfigFilters,
  PartnerListResponse,
  GameMapping,
  CreateGameMappingDto,
  UpdateGameMappingDto,
  SyncLog,
  SlotMapping,
  BookingMapping,
} from '@/types/partner';

export const partnerApi = {
  // ── PartnerConfig CRUD ──

  async getPartners(filters: PartnerConfigFilters = {}, page = 1, limit = 20): Promise<PartnerListResponse> {
    const params: Record<string, string | number | boolean | undefined> = { page, limit };
    if (filters.search) params.search = filters.search;
    if (filters.isActive !== undefined) params.isActive = filters.isActive;
    if (filters.syncMode) params.syncMode = filters.syncMode;
    if (filters.companyId) params.companyId = filters.companyId;

    const response = await apiClient.get<unknown>('/admin/partners', params);
    const items = extractList<PartnerConfig>(response.data, 'partners');
    const pagination = extractPagination(response.data, items.length, { page, limit });

    return { data: items, pagination };
  },

  async getPartnerById(id: number): Promise<PartnerConfig> {
    const response = await apiClient.get<unknown>(`/admin/partners/${id}`);
    const data = extractSingle<PartnerConfig>(response.data, 'partner');
    if (!data) throw new Error('Partner not found');
    return data;
  },

  async createPartner(dto: CreatePartnerConfigDto): Promise<PartnerConfig> {
    const response = await apiClient.post<unknown>('/admin/partners', dto);
    const data = extractSingle<PartnerConfig>(response.data, 'partner');
    if (!data) throw new Error('Failed to create partner');
    return data;
  },

  async updatePartner(id: number, dto: UpdatePartnerConfigDto): Promise<PartnerConfig> {
    const response = await apiClient.put<unknown>(`/admin/partners/${id}`, dto);
    const data = extractSingle<PartnerConfig>(response.data, 'partner');
    if (!data) throw new Error('Failed to update partner');
    return data;
  },

  async deletePartner(id: number): Promise<void> {
    await apiClient.delete(`/admin/partners/${id}`);
  },

  async testConnection(id: number): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const response = await apiClient.post<unknown>(`/admin/partners/${id}/test`, {});
    return extractSingle(response.data) ?? { success: false, message: 'Unknown error' };
  },

  // ── Game Mapping ──

  async getGameMappings(partnerId: number): Promise<GameMapping[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/${partnerId}/game-mappings`);
    return extractList<GameMapping>(response.data, 'gameMappings');
  },

  async createGameMapping(dto: CreateGameMappingDto): Promise<GameMapping> {
    const { partnerId, ...body } = dto;
    const response = await apiClient.post<unknown>(`/admin/partners/${partnerId}/game-mappings`, body);
    const data = extractSingle<GameMapping>(response.data, 'gameMapping');
    if (!data) throw new Error('Failed to create game mapping');
    return data;
  },

  async updateGameMapping(id: number, dto: UpdateGameMappingDto): Promise<GameMapping> {
    const response = await apiClient.put<unknown>(`/admin/partners/game-mappings/${id}`, dto);
    const data = extractSingle<GameMapping>(response.data, 'gameMapping');
    if (!data) throw new Error('Failed to update game mapping');
    return data;
  },

  async deleteGameMapping(id: number): Promise<void> {
    await apiClient.delete(`/admin/partners/game-mappings/${id}`);
  },

  // ── Sync ──

  async getSyncLogs(partnerId: number, params?: Record<string, string | number | boolean | undefined>): Promise<SyncLog[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/${partnerId}/sync-logs`, params);
    return extractList<SyncLog>(response.data, 'syncLogs');
  },

  async manualSync(partnerId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<unknown>(`/admin/partners/${partnerId}/sync`, {});
    return extractSingle(response.data) ?? { success: false, message: 'Unknown error' };
  },

  // ── Slot Mapping ──

  async getSlotMappings(partnerId: number, params?: Record<string, string | number | boolean | undefined>): Promise<SlotMapping[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/${partnerId}/slot-mappings`, params);
    return extractList<SlotMapping>(response.data);
  },

  // ── Booking Mapping ──

  async getBookingMappings(partnerId: number, params?: Record<string, string | number | boolean | undefined>): Promise<BookingMapping[]> {
    const response = await apiClient.get<unknown>(`/admin/partners/${partnerId}/booking-mappings`, params);
    return extractList<BookingMapping>(response.data, 'bookingMappings');
  },

  async resolveConflict(bookingMappingId: number, resolution: Record<string, string | number | boolean | undefined>): Promise<BookingMapping> {
    const response = await apiClient.post<unknown>(`/admin/partners/booking-mappings/${bookingMappingId}/resolve`, resolution);
    const data = extractSingle<BookingMapping>(response.data, 'bookingMapping');
    if (!data) throw new Error('Failed to resolve conflict');
    return data;
  },
} as const;
